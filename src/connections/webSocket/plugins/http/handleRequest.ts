import { WebSocketProxyConfig, HttpRequest, WebSocketServiceAppConfig } from "../../../../types";
import {
  HttpServiceWebSocketMessageRequest,
  WebSocketResponse,
  WebSocketMessageRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import respondToWebSocketClient from "../../respond";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got";
import { makeWebSocketResponse } from "./makeWebSocketResponse";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";

export default async function sendToService(
  request: WebSocketMessageRequest,
  conn: ActiveWebSocketConnection,
  config: WebSocketServiceAppConfig
) {
  const routeConfig = config.webSocket.routes[conn.route];

  for (const service of Object.keys(routeConfig.services)) {
    const cfg = routeConfig.services[service];
    if (cfg.type === "http") {
      const serviceConfig = cfg;

      const webSocketRequest: HttpServiceWebSocketMessageRequest = request;

      const httpRequest: HttpRequest = {
        path: conn.path,
        method: "POST",
        body: webSocketRequest,
        remoteAddress: conn.remoteAddress,
        remotePort: conn.remotePort,
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
            config
          );
        }
      } else {
        const options = makeGotOptions(httpRequest, undefined);
        got(
          await selectRandomUrl(serviceConfig.url, serviceConfig.getUrl),
          options
        )
          .then(async (serverResponse) => {
            const webSocketResponse = makeWebSocketResponse(
              serverResponse,
              request.id
            );
            respondToWebSocketClient(
              request.id,
              webSocketResponse,
              conn,
              config
            );
          })
          .catch(async (error) => {
            const webSocketResponse: WebSocketResponse = error.response
              ? makeWebSocketResponse(error.response, request.id)
              : {
                  id: request.id,
                  response: error.message,
                  route: conn.route,
                  service,
                  type: "message",
                };
          });
      }
    }
  }
}
