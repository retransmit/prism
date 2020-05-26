import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
import { get as activeConnections } from "./activeConnections";
import {
  WebSocketRouteConfig,
  WebSocketRequest,
} from "../../types/webSocketRequests";

import sendToHttpService from "./backends/http/sendToService";
import sendToRedisService from "./backends/redis/sendToService";
import { WebSocketProxyConfig } from "../../types";
import connect from "./connect";

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
    const requestId = randomId();
    activeConnections().set(requestId, {
      initialized: false,
      route,
      websocket: ws,
    });

    ws.on("message", async function message(message: string) {
      const conn = activeConnections().get(requestId);

      // This should never happen.
      if (!conn) {
        ws.terminate();
      } else {
        // If not initialized and there's an onConnect,
        // treat the first message as the onConnect argument.
        if (routeConfig.onConnect && !conn.initialized) {
          const onConnectResult = await routeConfig.onConnect(message);

          if (onConnectResult.drop) {
            activeConnections().delete(requestId);
            ws.terminate();
          } else {
            conn.initialized = true;
            connect(conn, websocketConfig);
          }
        }
        // Regular message. Pass this on...
        else {
          const onRequestHandlers =
            websocketConfig.onRequest ||
            websocketConfig.routes[route].onRequest;

          const messageToSend = onRequestHandlers
            ? await onRequestHandlers(message)
            : {
                handled: false as false,
                request: {
                  id: requestId,
                  type: "message",
                  route,
                  responseChannel: `${websocketConfig.redis?.responseChannel}.${config.instanceId}`,
                  request: message,
                } as WebSocketRequest,
              };

          for (const connector of connectors) {
            connector.sendToService(
              requestId,
              message,
              route,
              conn,
              websocketConfig
            );
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

async function handler(ctx: IRouterContext) {
  const config = configModule.get();
  const requestId = randomId(32);
}
