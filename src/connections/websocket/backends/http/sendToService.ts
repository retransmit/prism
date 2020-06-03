import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import { ActiveWebSocketConnection } from "../../activeConnections";
import {
  HttpServiceWebSocketMessageRequest,
  WebSocketResponse,
  WebSocketMessageRequest,
} from "../../../../types/webSocketRequests";
import respond from "../../respond";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import { makeWebSocketResponse } from "./makeWebSocketResponse";

export default async function sendToService(
  request: WebSocketMessageRequest,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[request.route];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "http") {
      const websocketRequest: HttpServiceWebSocketMessageRequest = request;

      const httpRequest: HttpRequest = {
        path: serviceConfig.url,
        method: "POST",
        body: websocketRequest,
        remoteAddress: conn.ip,
        remotePort: conn.port,
      };

      const onRequestResult = serviceConfig.onRequest
        ? await serviceConfig.onRequest(httpRequest)
        : {
            handled: false as false,
            request: httpRequest,
          };

      if (onRequestResult.handled) {
        if (onRequestResult.response) {
          respond(request.id, onRequestResult.response, conn, websocketConfig);
        }
      } else {
        const options = makeGotOptions(httpRequest);
        got(serviceConfig.url, options)
          .then(async (serverResponse) => {
            const websocketResponse = makeWebSocketResponse(
              serverResponse,
              request.id
            );
            respond(request.id, websocketResponse, conn, websocketConfig);
          })
          .catch(async (error) => {
            const websocketResponse: WebSocketResponse = error.response
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
