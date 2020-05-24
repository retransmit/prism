import { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";

import * as configModule from "../../config";
import randomId from "../../lib/random";
// import invokeHttpServices from "./backends/http/invokeServices";
// import rollbackHttp from "./backends/http/rollback";
// import invokeRedisServices from "./backends/redis/invokeServices";
// import rollbackRedis from "./backends/redis/rollback";
// import mergeResponses from "./mergeResponses";
import responseIsError from "../../lib/http/responseIsError";
import HttpRequestContext from "./RequestContext";
import {
  FetchedHttpResponse,
  InvokeServiceResult,
} from "../../types/httpRequests";
import WebSocketRequestContext from "./RequestContext";
import activeConnections from "./activeConnections";
import { WebSocketRouteConfig } from "../../types/webSocketRequests";

// const connectors = [
//   { type: "http", invokeServices: invokeHttpServices, rollback: rollbackHttp },
//   {
//     type: "redis",
//     invokeServices: invokeRedisServices,
//     rollback: rollbackRedis,
//   },
// ];

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
  if (config.websockets) {
    for (const route of Object.keys(config.websockets.routes)) {
      const routeConfig = config.websockets.routes[route];
      const wss = new WebSocket.Server({ noServer: true });
      websocketServers[route] = wss;

      (function (route: string, routeConfig: WebSocketRouteConfig) {
        wss.on("connection", async function connection(
          ws: WebSocket,
          request: IncomingMessage
        ) {
          const requestId = randomId();
          activeConnections.set(requestId, {
            initialized: false,
            websocket: ws,
          });

          ws.on("message", async function message(msg: string) {
            const conn = activeConnections.get(requestId);

            // This should never happen.
            if (!conn) {
              ws.terminate();
            } else {
              // If not initialized and there's an onConnect,
              // treat the first message as the onConnect argument.
              if (routeConfig.onConnect && !conn.initialized) {
                const onConnectResult = await routeConfig.onConnect(
                  JSON.parse(msg)
                );

                if (onConnectResult.drop) {
                  activeConnections.delete(requestId);
                  ws.terminate();
                } else {
                  conn.initialized = true;
                }
              }
              // Regular message. Pass this on...
              else {
                
              }
            }
          });
        });
      })(route, routeConfig);
    }
  }
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
