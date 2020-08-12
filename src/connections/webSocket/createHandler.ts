import { IncomingMessage } from "http";
import WebSocket from "ws";
import * as url from "url";
import randomId from "../../utils/random";
import { get as activeConnections } from "./activeConnections";
import {
  ActiveWebSocketConnection,
  WebSocketRequest,
} from "../../types/webSocket";
import { WebSocketRouteConfig } from "../../types/config/webSocketProxy";

import { WebSocketProxyAppConfig, AppConfig } from "../../types/config";
import { saveLastRequest } from "./plugins/urlPolling/poll";
import applyRateLimiting from "../modules/rateLimiting";
import plugins from "./plugins";
import { parse } from "url";
import { isWebSocketProxyConfig } from "./isWebSocketProxyConfig";
import { getHeaderAsString } from "../../utils/http/getHeaderAsString";
import addTrackingInfo from "../modules/clientTracking";
import { PluginList } from "../../types/plugins";
import { WebSocketServicePlugin } from "../../types/webSocket";

export default function createHandler(config: AppConfig) {
  return function connection(ws: WebSocket, request: IncomingMessage) {
    if (isWebSocketProxyConfig(config)) {
      const route = request.url ? parse(request.url).pathname : "";
      if (route) {
        const routeConfig = config.webSocket.routes[route];

        // This is for finding dead connections.
        (ws as any).isAlive = true;
        ws.on("pong", function heartbeat() {
          (this as any).isAlive = true;
        });

        const requestId = randomId();

        const xForwardedFor = getHeaderAsString(
          request.headers["x-forwarded-for"]
        );

        const remoteAddress = xForwardedFor
          ? xForwardedFor.split(/\s*,\s*/)[0]
          : request.socket.remoteAddress;

        const conn: ActiveWebSocketConnection = {
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

        // If the onConnect hook is defined, we postpone connection init till a message arrives from the user. When the message arrives, the message is sent to the onConnect hook - which can return whether the connection needs to be dropped or not. This is useful, for say, authentication.

        // If there is no onConnect hook, then initialize immediately. And notify backends that a new connection has arrived.

        if (!routeConfig.onConnect && !config.webSocket.onConnect) {
          conn.initialized = true;
          sendConnectionRequestsToServices(
            requestId,
            undefined,
            conn,
            routeConfig,
            config,
            plugins
          );
        }

        ws.on(
          "message",
          onMessage(requestId, request, route, ws, routeConfig, config)
        );

        ws.on("close", onClose(requestId, config, plugins));
      }
    }
  };
}

function onMessage(
  requestId: string,
  request: IncomingMessage,
  route: string,
  ws: WebSocket,
  routeConfig: WebSocketRouteConfig,
  config: WebSocketProxyAppConfig
) {
  return async function (message: string) {
    const conn = activeConnections().get(requestId);

    // This should never happen.
    if (!conn) {
      ws.terminate();
    } else {
      const onConnect = routeConfig.onConnect || config.webSocket.onConnect;

      if (!conn.initialized && onConnect) {
        // One check above is redundant.
        // If conn is not initialized, onConnect must exist.
        // Treat the first message as the onConnect argument.

        const connectRequest: WebSocketRequest = {
          id: requestId,
          message,
          remoteAddress: conn.remoteAddress,
          remotePort: conn.remotePort,
        };

        const onConnectResult = (await onConnect(connectRequest)) || {
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
          onConnectResult.connectMessage,
          conn,
          routeConfig,
          config,
          plugins
        );
      }
      // This is an active connection.
      // Pass on the message to backend services.
      else {
        // Add client tracking info
        addTrackingInfo(
          route,
          "GET",
          conn.remoteAddress || "",
          routeConfig,
          config.webSocket,
          config
        );

        const rateLimitedResponse = await applyRateLimiting(
          "webSocket",
          route,
          "GET",
          conn.remoteAddress || "",
          config
        );

        if (rateLimitedResponse !== undefined) {
          ws.send(rateLimitedResponse);
          return;
        }

        const onRequest =
          config.webSocket.onRequest ||
          config.webSocket.routes[route].onRequest;

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
              config
            );
          }
        }
      }
    }
  };
}

async function sendConnectionRequestsToServices(
  requestId: string,
  message: string | undefined,
  conn: ActiveWebSocketConnection,
  routeConfig: WebSocketRouteConfig,
  config: WebSocketProxyAppConfig,
  plugins: PluginList<WebSocketServicePlugin>
) {
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    plugins[serviceConfig.type].connect(
      requestId,
      message,
      conn,
      serviceConfig,
      config
    );
  }
}

function onClose(
  requestId: string,
  config: WebSocketProxyAppConfig,
  plugins: PluginList<WebSocketServicePlugin>
) {
  return async function () {
    // Find the handler in question.
    const conn = activeConnections().get(requestId);
    if (conn) {
      const routeConfig = config.webSocket.routes[conn.route];
      const onDisconnect =
        routeConfig.onDisconnect || config.webSocket.onDisconnect;
      if (onDisconnect) {
        onDisconnect(requestId);
      }

      // Call disconnect for services
      for (const service of Object.keys(
        config.webSocket.routes[conn.route].services
      )) {
        const serviceConfig =
          config.webSocket.routes[conn.route].services[service];
        plugins[serviceConfig.type].disconnect(
          requestId,
          conn,
          serviceConfig,
          config
        );
      }
    }
  };
}
