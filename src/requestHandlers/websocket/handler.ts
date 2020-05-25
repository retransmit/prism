import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
import WebSocketRequestContext from "./RequestContext";
import activeConnections from "./activeConnections";
import { WebSocketRouteConfig } from "../../types/webSocketRequests";

import handleHttpMessage from "./backends/http/handleMessage";
import handleRedisMessage from "./backends/redis/handleMessage";
import { WebSocketProxyConfig } from "../../types";

const connectors = [
  { type: "http", handleMessage: handleHttpMessage },
  {
    type: "redis",
    handleMessage: handleRedisMessage,
  },
];

/*
  Make an HTTP request handler
*/
export default function createHandler() {
  return async function websocketHandler(ctx: IRouterContext) {
    return await handler(new WebSocketRequestContext(ctx));
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
  wss.on("connection", async function connection(
    ws: WebSocket,
    request: IncomingMessage
  ) {
    const requestId = randomId();
    activeConnections.set(requestId, {
      initialized: false,
      websocket: ws,
    });

    ws.on("message", async function message(message: string) {
      const conn = activeConnections.get(requestId);

      // This should never happen.
      if (!conn) {
        ws.terminate();
      } else {
        // If not initialized and there's an onConnect,
        // treat the first message as the onConnect argument.
        if (routeConfig.onConnect && !conn.initialized) {
          const onConnectResult = await routeConfig.onConnect(message);

          if (onConnectResult.drop) {
            activeConnections.delete(requestId);
            ws.terminate();
          } else {
            conn.initialized = true;
          }
        }
        // Regular message. Pass this on...
        else {
          for (const connector of connectors) {
            connector.handleMessage(requestId, message, route, websocketConfig);
          }
        }
      }
    });
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

async function handler(ctx: WebSocketRequestContext) {
  const config = configModule.get();
  const requestId = randomId(32);
}
