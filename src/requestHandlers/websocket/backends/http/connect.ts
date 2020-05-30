import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketConnectRequest,
} from "../../../../types/webSocketRequests";import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";

export default function disconnect(
  requestId: string,
  defaultRequest: WebSocketConnectRequest,
  route: string,
  handlerConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const conn = activeConnections.get().get(requestId);

  const routeConfig = websocketConfig.routes[route];

  if (conn) {
    for (const service of Object.keys(routeConfig.services)) {
      const serviceConfig = routeConfig.services[service];

      if (serviceConfig.type === "http") {
        const websocketRequest: WebSocketConnectRequest = {
          id: requestId,
          type: "connect",
          route,
        };

        const request: HttpRequest = {
          path: serviceConfig.onDisconnectUrl,
          method: "POST",
          body: websocketRequest,
          remoteAddress: conn.ip,
          remotePort: conn.port,
        };

        const options = makeGotOptions(request);

        got(serviceConfig.url, options).catch(async (error) => {
          // TODO...
        });
      }
    }
  }
}
