import { IncomingMessage } from "http";
import WebSocket from "ws";
import * as url from "url";
import randomId from "../../utils/random";
import { get as activeConnections } from "./activeConnections";
import {
  WebSocketRouteConfig,
  ActiveWebSocketConnection,
  IWebSocketRequestHandlerPlugin,
} from "../../types/webSocket";

import { WebSocketProxyConfig, AppConfig, PluginList } from "../../types";
import { saveLastRequest } from "./plugins/http/poll";
import applyRateLimiting from "../modules/rateLimiting";

export default function makeHandler(plugins: {
  [name: string]: IWebSocketRequestHandlerPlugin;
}) {
  return function onConnection(
    route: string,
    routeConfig: WebSocketRouteConfig,
    webSocketConfig: WebSocketProxyConfig,
    config: AppConfig
  ) {
    return async function connection(ws: WebSocket, request: IncomingMessage) {
      // This is for finding dead connections.
      (ws as any).isAlive = true;
      ws.on("pong", function heartbeat() {
        (this as any).isAlive = true;
      });

      const requestId = randomId();

      const xForwardedFor = request.headers["x-forwarded-for"];
      const remoteAddress = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor
        ? xForwardedFor.split(/\s*,\s*/)[0]
        : request.socket.remoteAddress;

      const conn = {
        initialized: false,
        route,
        path: (request.url && url.parse(request.url).pathname) || "",
        webSocket: ws,
        remoteAddress,
        remotePort: request.socket.remotePort,
        saveLastRequest: saveLastRequest(routeConfig),
        lastRequest: undefined,
      };
      activeConnections().set(requestId, conn);

      /*
        If the onConnect hook is defined, we postpone connection init till a message arrives from the user. When the message arrives, the message is sent to the onConnect hook - which can return whether the connection needs to be dropped or not. This is useful, for say, authentication.
  
        If there is no onConnect hook, then initialize immediately. And notify backends that a new connection has arrived.
      */
      if (!routeConfig.onConnect && !webSocketConfig.onConnect) {
        conn.initialized = true;
        sendConnectionRequestsToServices(
          requestId,
          conn,
          routeConfig,
          webSocketConfig,
          config,
          plugins
        );
      }

      ws.on(
        "message",
        onMessage(
          requestId,
          request,
          route,
          ws,
          routeConfig,
          webSocketConfig,
          config
        )
      );

      ws.on("close", onClose(requestId, webSocketConfig, config, plugins));
    };
  };

  function onMessage(
    requestId: string,
    request: IncomingMessage,
    route: string,
    ws: WebSocket,
    routeConfig: WebSocketRouteConfig,
    webSocketConfig: WebSocketProxyConfig,
    config: AppConfig
  ) {
    return async function (message: string) {
      const conn = activeConnections().get(requestId);

      // This should never happen.
      if (!conn) {
        ws.terminate();
      } else {
        const onConnect = routeConfig.onConnect || webSocketConfig.onConnect;

        if (!conn.initialized && onConnect) {
          // One check above is redundant.
          // If conn is not initialized, onConnect must exist.
          // Treat the first message as the onConnect argument.

          const onConnectResult = (await onConnect(requestId, message)) || {
            drop: false,
          };

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
            webSocketConfig,
            config,
            plugins
          );
        }
        // This is an active connection.
        // Pass on the message to backend services.
        else {
          const rateLimitedResponse = await applyRateLimiting(
            route,
            "GET",
            conn.remoteAddress || "",
            routeConfig,
            webSocketConfig,
            config
          );

          if (rateLimitedResponse !== undefined) {
            ws.send(rateLimitedResponse);
            return;
          }

          const onRequest =
            webSocketConfig.onRequest ||
            webSocketConfig.routes[route].onRequest;

          const onRequestResult = (onRequest &&
            (await onRequest(requestId, message))) || {
            handled: false as false,
            request: {
              id: requestId,
              path: conn.path,
              request: message,
              route,
              remoteAddress: request.connection.remoteAddress,
              remotePort: request.connection.remotePort,
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

            for (const pluginName of Object.keys(plugins)) {
              plugins[pluginName].handleRequest(
                onRequestResult.request,
                conn,
                webSocketConfig,
                config
              );
            }
          }
        }
      }
    };
  }
}

async function sendConnectionRequestsToServices(
  requestId: string,
  conn: ActiveWebSocketConnection,
  routeConfig: WebSocketRouteConfig,
  webSocketConfig: WebSocketProxyConfig,
  config: AppConfig,
  plugins: PluginList<IWebSocketRequestHandlerPlugin>
) {
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    plugins[serviceConfig.type].connect(
      requestId,
      conn,
      serviceConfig,
      webSocketConfig,
      config
    );
  }
}

function onClose(
  requestId: string,
  webSocketConfig: WebSocketProxyConfig,
  config: AppConfig,
  plugins: PluginList<IWebSocketRequestHandlerPlugin>
) {
  return async function () {
    // Find the handler in question.
    const conn = activeConnections().get(requestId);
    if (conn) {
      const routeConfig = webSocketConfig.routes[conn.route];
      const onDisconnect =
        routeConfig.onDisconnect || webSocketConfig.onDisconnect;
      if (onDisconnect) {
        onDisconnect(requestId);
      }

      // Call disconnect for services
      for (const service of Object.keys(
        webSocketConfig.routes[conn.route].services
      )) {
        const serviceConfig =
          webSocketConfig.routes[conn.route].services[service];
        plugins[serviceConfig.type].disconnect(
          requestId,
          conn,
          serviceConfig,
          webSocketConfig,
          config
        );
      }
    }
  };
}
