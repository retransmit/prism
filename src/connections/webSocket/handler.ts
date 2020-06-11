import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
import {
  get as activeConnections,
  ActiveWebSocketConnection,
} from "./activeConnections";
import { WebSocketRouteConfig } from "../../types/webSocketRequests";

import sendToHttpService from "./backends/http/sendToService";
import sendToRedisService from "./backends/redis/sendToService";
import { WebSocketProxyConfig } from "../../types";

import httpConnect from "./backends/http/connect";
import redisConnect from "./backends/redis/connect";
import httpDisconnect from "./backends/http/disconnect";
import redisDisconnect from "./backends/redis/disconnect";
import { saveLastRequest } from "./backends/http/poll";
import onConnect from "../../test/integration/connections/websocket/backends/onConnect";

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

export function init(): WebSocket.Server[] {
  const config = configModule.get();
  const websocketConfig = config.webSocket;
  if (websocketConfig) {
    for (const route of Object.keys(websocketConfig.routes)) {
      const routeConfig = websocketConfig.routes[route];
      const wss = new WebSocket.Server({ noServer: true });
      websocketServers[route] = wss;
      setupWebSocketHandling(wss, route, routeConfig, websocketConfig);
    }
  }
  return Object.keys(websocketServers).reduce(
    (acc, route) => acc.concat(websocketServers[route]),
    [] as WebSocket.Server[]
  );
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

    const conn = {
      initialized: false,
      route,
      webSocket: ws,
      ip,
      port: request.socket.remotePort,
      saveLastRequest: saveLastRequest(routeConfig),
      lastRequest: undefined,
    };
    activeConnections().set(requestId, conn);

    /*
      If the onConnect hook is defined, we postpone connection init till a message arrives from the user. When the message arrives, the message is sent to the onConnect hook - which can return whether the connection needs to be dropped or not. This is useful, for say, authentication.

      If there is no onConnect hook, then initialize immediately. And notify backends that a new connection has arrived.
    */
    if (!routeConfig.onConnect && !websocketConfig.onConnect) {
      conn.initialized = true;
      sendConnectionRequestsToServices(
        requestId,
        conn,
        routeConfig,
        websocketConfig
      );
    }

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
      const onConnect = routeConfig.onConnect || websocketConfig.onConnect;
      
      if (!conn.initialized && onConnect) {
        // One check above is redundant. 
        // If conn is not initialized, onConnect must exist.
        // Treat the first message as the onConnect argument.

        const onConnectResult = await onConnect(requestId, message);

        if (onConnectResult.drop === true) {
          activeConnections().delete(requestId);
          if (onConnectResult.message) {
            ws.send(onConnectResult.message);
            ws.terminate();
          } else {
            ws.terminate();
          }
          // We're done here.
          return;
        }

        // Not dropping. Initialize the connection.
        // And send the connect request.
        conn.initialized = true;
        sendConnectionRequestsToServices(
          requestId,
          conn,
          routeConfig,
          websocketConfig
        );
      }
      // This is an active connection.
      // Pass on the message to backend services.
      else {
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

async function sendConnectionRequestsToServices(
  requestId: string,
  conn: ActiveWebSocketConnection,
  routeConfig: WebSocketRouteConfig,
  websocketConfig: WebSocketProxyConfig
) {
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http") {
      httpConnect(requestId, conn, serviceConfig, websocketConfig);
    } else if (serviceConfig.type === "redis") {
      redisConnect(requestId, conn, serviceConfig, websocketConfig);
    }
  }
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
      for (const service of Object.keys(
        websocketConfig.routes[conn.route].services
      )) {
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
