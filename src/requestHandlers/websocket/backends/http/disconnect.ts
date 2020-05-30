import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketDisconnectRequest,
  WebSocketResponse,
} from "../../../../types/webSocketRequests";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import { makeWebSocketResponse } from "./makeWebSocketResponse";
import * as activeConnections from "../../activeConnections";

export default function disconnect(
  requestId: string,
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
        const websocketRequest: WebSocketDisconnectRequest = {
          id: requestId,
          type: "disconnect",
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

        // We don't care about the response here.
        // The client has already disco'ed.
        got(serviceConfig.url, options).catch(async (error) => {
          // TODO...
        });
      }
    }
  }
}
