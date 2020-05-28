import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import { ActiveWebSocketConnection } from "../../activeConnections";
import {
  HttpServiceWebSocketMessageRequest,
  WebSocketResponse,
} from "../../../../types/webSocketRequests";
import respond from "../../respond";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import { makeWebSocketResponse } from "./makeWebSocketResponse";

export default async function sendToService(
  requestId: string,
  message: string,
  route: string,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[route];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "http") {
      const websocketRequest: HttpServiceWebSocketMessageRequest = {
        id: requestId,
        type: "message",
        route,
        request: message,
      };

      const httpRequest: HttpRequest = {
        path: serviceConfig.config.url,
        method: "POST",
        body: websocketRequest,
        remoteAddress: conn.ip,
        remotePort: conn.port
      };

      const onRequestResult = serviceConfig.onRequest
        ? await serviceConfig.onRequest(requestId, httpRequest)
        : { handled: false as false, request: message };

      if (onRequestResult.handled) {
        respond(requestId, onRequestResult.response, conn, websocketConfig);
      } else {
        const options = makeGotOptions(httpRequest);
        got(serviceConfig.config.url, options)
          .then(async (serverResponse) => {
            const websocketResponse = makeWebSocketResponse(
              serverResponse,
              requestId
            );
            respond(requestId, websocketResponse, conn, websocketConfig);
          })
          .catch(async (error) => {
            const websocketResponse: WebSocketResponse = error.response
              ? makeWebSocketResponse(error.response, requestId)
              : {
                  id: requestId,
                  response: error.message,
                  route,
                  service,
                  type: "message",
                };
          });
      }
    }
  }
}
