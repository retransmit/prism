import { IncomingMessage } from "http";
import WebSocket from "ws";
import randomId from "../../utils/random";
import { get as activeConnections } from "./activeConnections";
import {
  ActiveWebSocketConnection,
  WebSocketClientRequest,
  WebSocketServiceRequest,
  WebSocketServiceConnectRequest,
  WebSocketServiceMessageRequest,
  WebSocketServiceDisconnectRequest,
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
import respondToWebSocketClient from "./respond";

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

        const connectionId = randomId();

        const xForwardedFor = getHeaderAsString(
          request.headers["x-forwarded-for"]
        );

        const remoteAddress = xForwardedFor
          ? xForwardedFor.split(/\s*,\s*/)[0]
          : request.socket.remoteAddress;

        const conn: ActiveWebSocketConnection = {
          id: connectionId,
          initialized: false,
          route,
          webSocket: ws,
          remoteAddress,
          remotePort: request.socket.remotePort,
          saveLastRequest: saveLastRequest(routeConfig),
          lastRequest: undefined,
        };

        activeConnections().set(connectionId, conn);

        // If the onConnect hook is defined, we postpone connection init till a message arrives from the user. When the message arrives, the message is sent to the onConnect hook - which can decide whether the connection needs to be dropped or not. This is useful for say, authentication.

        // If there is no onConnect hook, then initialize immediately. And notify backends that a new connection has been established.

        if (!routeConfig.onConnect && !config.webSocket.onConnect) {
          conn.initialized = true;
          const connectRequest: WebSocketServiceConnectRequest = {
            id: connectionId,
            type: "connect",
            route,
            remoteAddress: conn.remoteAddress,
            remotePort: conn.remotePort,
          };
          sendRequestToServices(connectRequest, conn, config);
        }

        ws.on(
          "message",
          onMessage(connectionId, request, route, ws, routeConfig, config)
        );

        ws.on("close", onClose(connectionId, config, plugins));
      }
    }
  };
}

function onMessage(
  connectionId: string,
  request: IncomingMessage,
  route: string,
  ws: WebSocket,
  routeConfig: WebSocketRouteConfig,
  config: WebSocketProxyAppConfig
) {
  return async function (message: string) {
    const conn = activeConnections().get(connectionId);

    // This should never happen.
    if (!conn) {
      ws.terminate();
    } else {
      const onConnect = routeConfig.onConnect || config.webSocket.onConnect;

      if (!conn.initialized && onConnect) {
        // One check above is redundant.
        // If conn is not initialized, onConnect must exist.
        // Treat the first message as the onConnect argument.
        const clientRequest: WebSocketClientRequest = {
          id: connectionId,
          message,
          remoteAddress: conn.remoteAddress,
          remotePort: conn.remotePort,
        };

        const onConnectResult = await onConnect(clientRequest);

        if (onConnectResult && onConnectResult.drop) {
          activeConnections().delete(connectionId);
          if (onConnectResult.message) {
            ws.send(onConnectResult.message);
          }
          ws.terminate();

          // We're done here.
          return;
        }

        // Not dropping. Initialize the connection.
        // And send the connect request.
        conn.initialized = true;

        if (onConnectResult && onConnectResult.request) {
          sendRequestToServices(onConnectResult.request, conn, config);
        }
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
          config.webSocket.routes[route].onRequest ||
          config.webSocket.onRequest;

        const clientRequest: WebSocketClientRequest = {
          id: connectionId,
          message,
          remoteAddress: conn.remoteAddress,
          remotePort: conn.remotePort,
        };

        const onRequestResult = (onRequest &&
          (await onRequest(clientRequest))) || {
          handled: false as false,
          message,
        };

        if (onRequestResult.handled) {
          if (onRequestResult.response) {
            respondToWebSocketClient(onRequestResult.response, conn, config);
          }
        } else {
          const serviceRequest: WebSocketServiceMessageRequest = {
            id: connectionId,
            route,
            type: "message",
            message: onRequestResult.message,
            remoteAddress: conn.remoteAddress,
            remotePort: conn.remotePort,
          };

          if (conn.saveLastRequest) {
            conn.lastRequest = onRequestResult.message;
          }

          sendRequestToServices(serviceRequest, conn, config);
        }
      }
    }
  };
}

function sendRequestToServices(
  request: WebSocketServiceRequest,
  conn: ActiveWebSocketConnection,
  config: WebSocketProxyAppConfig
) {
  for (const pluginName of Object.keys(plugins)) {
    plugins[pluginName].handleRequest(request, conn, config);
  }
}

function onClose(
  connectionId: string,
  config: WebSocketProxyAppConfig,
  plugins: PluginList<WebSocketServicePlugin>
) {
  return async function () {
    // Find the handler in question.
    const conn = activeConnections().get(connectionId);
    if (conn) {
      const routeConfig = config.webSocket.routes[conn.route];
      const onDisconnect =
        routeConfig.onDisconnect || config.webSocket.onDisconnect;
      if (onDisconnect) {
        const onDisconnectResult = await onDisconnect(conn);

        if (typeof onDisconnectResult !== "undefined") {
          const disconnectRequest: WebSocketServiceDisconnectRequest = {
            id: conn.id,
            type: "disconnect",
            route: conn.route,
            remoteAddress: conn.remoteAddress,
            remotePort: conn.remotePort,
          };
          sendRequestToServices(disconnectRequest, conn, config);
        }
      }
    }
  };
}
