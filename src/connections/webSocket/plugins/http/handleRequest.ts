import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketMessageRequest,
  WebSocketResponse,
  WebSocketMessageRequest,
  ActiveWebSocketConnection
} from "../../../../types/webSocket";
import respondToWebSocketClient from "../../respond";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got";
import { makeWebSocketResponse } from "./makeWebSocketResponse";

export default async function sendToService(
  request: WebSocketMessageRequest,
  conn: ActiveWebSocketConnection,
  webSocketConfig: WebSocketProxyConfig
) {
  const routeConfig = webSocketConfig.routes[request.route];

  for (const service of Object.keys(routeConfig.services)) {
    const cfg = routeConfig.services[service];
    if (cfg.type === "http") {
      const serviceConfig = cfg;

      const webSocketRequest: HttpServiceWebSocketMessageRequest = request;

      const httpRequest: HttpRequest = {
        path: serviceConfig.url,
        method: "POST",
        body: webSocketRequest,
        remoteAddress: conn.ip,
        remotePort: conn.port,
      };

      const onRequestResult = (serviceConfig.onRequest &&
        (await serviceConfig.onRequest(httpRequest))) || {
        handled: false as false,
        request: httpRequest,
      };

      if (onRequestResult.handled) {
        if (onRequestResult.response) {
          respondToWebSocketClient(
            request.id,
            onRequestResult.response,
            conn,
            webSocketConfig
          );
        }
      } else {
        const options = makeGotOptions(httpRequest, undefined);
        got(serviceConfig.url, options)
          .then(async (serverResponse) => {
            const webSocketResponse = makeWebSocketResponse(
              serverResponse,
              request.id
            );
            respondToWebSocketClient(
              request.id,
              webSocketResponse,
              conn,
              webSocketConfig
            );
          })
          .catch(async (error) => {
            const webSocketResponse: WebSocketResponse = error.response
              ? makeWebSocketResponse(error.response, request.id)
              : {
                  id: request.id,
                  response: error.message,
                  route: request.route,
                  service,
                  type: "message",
                };
          });
      }
    }
  }
}
