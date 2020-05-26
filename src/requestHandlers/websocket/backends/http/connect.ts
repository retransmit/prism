import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketDisconnectRequest,
  WebSocketResponse,
  WebSocketConnectRequest,
} from "../../../../types/webSocketRequests";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import { makeWebSocketResponse } from "./makeWebSocketResponse";

export default function disconnect(
  requestId: string,
  route: string,
  handlerConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[route];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "http") {
      const websocketRequest: WebSocketConnectRequest = {
        id: requestId,
        type: "connect",
        route,
      };

      const httpRequest: HttpRequest = {
        path: serviceConfig.config.onDisconnectUrl,
        method: "POST",
        body: websocketRequest,
      };

      const options = makeGotOptions(httpRequest);
      
      got(serviceConfig.config.url, options)
        .catch(async (error) => {
          // TODO...
        });
    }
  }
}
