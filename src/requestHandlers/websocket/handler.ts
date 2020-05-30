import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
import { get as activeConnections } from "./activeConnections";
import {
  WebSocketRouteConfig,
  RedisServiceWebSocketRequest,
  WebSocketConnectRequest,
  WebSocketRequest,
} from "../../types/webSocketRequests";

import sendToHttpService from "./backends/http/sendToService";
import sendToRedisService from "./backends/redis/sendToService";
import { WebSocketProxyConfig } from "../../types";
import connect from "./connect";
import disconnect from "./disconnect";

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
  wss.on("connection", async function connection(
    ws: WebSocket,
    request: IncomingMessage
  ) {
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
    });

    ws.on("message", async function message(message: string) {
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
            connect(requestId, conn, websocketConfig);
          }
        }
        // Regular message. Pass this on...
        else {
          if (!conn.initialized) {
            conn.initialized = true;
          }
          const onRequest =
            websocketConfig.onRequest ||
            websocketConfig.routes[route].onRequest;

          const onRequestResult = onRequest
            ? await onRequest(requestId, message)
            : { handled: false as false, request: message };

          if (onRequestResult.handled) {
            if (onRequestResult.response.type === "message") {
              ws.send(onRequestResult.response.response);
            } else if (onRequestResult.response.type === "disconnect") {
              ws.terminate();
            }
          } else {
            for (const connector of connectors) {
              connector.sendToService(
                requestId,
                onRequestResult.request,
                route,
                conn,
                websocketConfig
              );
            }
          }
        }
      }
    });

    ws.on("close", async () => {
      // Find the handler in question.
      const conn = activeConnections().get(requestId);
      if (conn) {
        const handlerConfig = websocketConfig.routes[conn.route];
        const onDisconnect =
          handlerConfig.onDisconnect || websocketConfig.onDisconnect;
        if (onDisconnect) {
          onDisconnect(requestId);
        }

        // Call disconnect for services
        disconnect(requestId, conn, websocketConfig);
      }
    });
  });

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
