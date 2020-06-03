import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
import { get as activeConnections } from "./activeConnections";
import { WebSocketRouteConfig } from "../../types/webSocketRequests";

import sendToHttpService from "./backends/http/sendToService";
import sendToRedisService from "./backends/redis/sendToService";
import { WebSocketProxyConfig } from "../../types";

import httpConnect from "./backends/http/connect";
import redisConnect from "./backends/redis/connect";
import httpDisconnect from "./backends/http/disconnect";
import redisDisconnect from "./backends/redis/disconnect";
import { saveLastRequest } from "./backends/http/poll";

const connectors = [
  { type: "http", sendToService: sendToHttpService },
  {
    type: "redis",
    sendToService: sendToRedisService,
  },
];

/*
  Make an HTTP request handler
*/
export default function createHandler() {
  return async function websocketHandler(ctx: IRouterContext) {
    return await handler(ctx);
  };
}

const websocketServers: {
  [key: string]: WebSocket.Server;
} = {};

export function init() {
  const config = configModule.get();
  const websocketConfig = config.websockets;
  if (websocketConfig) {
    for (const route of Object.keys(websocketConfig.routes)) {
      const routeConfig = websocketConfig.routes[route];
      const wss = new WebSocket.Server({ noServer: true });
      websocketServers[route] = wss;
      setupWebSocketHandling(wss, route, routeConfig, websocketConfig);
    }
  }
}

function setupWebSocketHandling(
  wss: WebSocket.Server,
  route: string,
  routeConfig: WebSocketRouteConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();
  wss.on("connection", onConnection(route, routeConfig, websocketConfig));

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws: any) {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(function noop() {});
    });
  }, 30000);

  wss.on("close", function close() {
    clearInterval(interval);
  });
}

function onConnection(
  route: string,
  routeConfig: WebSocketRouteConfig,
  websocketConfig: WebSocketProxyConfig
) {
  return async function connection(ws: WebSocket, request: IncomingMessage) {
    // This is for finding dead connections.
    (ws as any).isAlive = true;
    ws.on("pong", function heartbeat() {
      (this as any).isAlive = true;
    });

    const requestId = randomId();

    const xForwardedFor = request.headers["x-forwarded-for"];
    const ip = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor
      ? xForwardedFor.split(/\s*,\s*/)[0]
      : request.socket.remoteAddress;

    activeConnections().set(requestId, {
      initialized: false,
      route,
      websocket: ws,
      ip,
      port: request.socket.remotePort,
      saveLastRequest: saveLastRequest(routeConfig),
      lastRequest: undefined,
    });

    ws.on(
      "message",
      onMessage(requestId, route, ws, routeConfig, websocketConfig)
    );

    ws.on("close", onClose(requestId, websocketConfig));
  };
}

function onMessage(
  requestId: string,
  route: string,
  ws: WebSocket,
  routeConfig: WebSocketRouteConfig,
  websocketConfig: WebSocketProxyConfig
) {
  return async function (message: string) {
    const conn = activeConnections().get(requestId);

    // This should never happen.
    if (!conn) {
      ws.terminate();
    } else {
      // If not initialized and there's an onConnect,
      // treat the first message as the onConnect argument.
      const onConnect = routeConfig.onConnect || websocketConfig.onConnect;

      if (!conn.initialized && onConnect) {
        const onConnectResult = await onConnect(requestId, message);

        if (onConnectResult.drop === true) {
          activeConnections().delete(requestId);
          ws.terminate();
        } else {
          conn.initialized = true;
          const route = conn.route;
          for (const service of Object.keys(
            websocketConfig.routes[conn.route]
          )) {
            const serviceConfig =
              websocketConfig.routes[route].services[service];
            if (serviceConfig.type === "http") {
              httpConnect(requestId, conn, serviceConfig, websocketConfig);
            } else if (serviceConfig.type === "redis") {
              redisConnect(requestId, conn, serviceConfig, websocketConfig);
            }
          }
        }
      }
      // Regular message. Pass this on...
      else {
        if (!conn.initialized) {
          conn.initialized = true;
        }
        const onRequest =
          websocketConfig.onRequest || websocketConfig.routes[route].onRequest;

        const onRequestResult = onRequest
          ? await onRequest(requestId, message)
          : {
              handled: false as false,
              request: {
                id: requestId,
                request: message,
                route,
                type: "message" as "message",
              },
            };

        if (onRequestResult.handled) {
          if (onRequestResult.response) {
            if (onRequestResult.response.type === "message") {
              ws.send(onRequestResult.response.response);
            } else if (onRequestResult.response.type === "disconnect") {
              ws.terminate();
            }
          }
        } else {
          if (conn.saveLastRequest) {
            conn.lastRequest = onRequestResult.request;
          }

          for (const connector of connectors) {
            connector.sendToService(
              onRequestResult.request,
              conn,
              websocketConfig
            );
          }
        }
      }
    }
  };
}

function onClose(requestId: string, websocketConfig: WebSocketProxyConfig) {
  return async function () {
    // Find the handler in question.
    const conn = activeConnections().get(requestId);
    if (conn) {
      const routeConfig = websocketConfig.routes[conn.route];
      const onDisconnect =
        routeConfig.onDisconnect || websocketConfig.onDisconnect;
      if (onDisconnect) {
        onDisconnect(requestId);
      }

      // Call disconnect for services
      const route = conn.route;
      for (const service of Object.keys(websocketConfig.routes[conn.route])) {
        const serviceConfig = websocketConfig.routes[route].services[service];
        if (serviceConfig.type === "redis") {
          redisDisconnect(requestId, conn, serviceConfig, websocketConfig);
        } else if (serviceConfig.type === "http") {
          httpDisconnect(requestId, conn, serviceConfig, websocketConfig);
        }
      }
    }
  };
}

export function upgrade(
  request: IncomingMessage,
  socket: Socket,
  head: Buffer
) {
  if (request.url) {
    const server = websocketServers[request.url];
    if (server) {
      server.handleUpgrade(request, socket, head, function done(ws) {
        server.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
}

async function handler(ctx: IRouterContext) {
  const config = configModule.get();
  const requestId = randomId(32);
}
