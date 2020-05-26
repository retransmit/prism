import { WebSocketProxyConfig } from "../../../../types";
import { ActiveWebSocketConnection } from "../../activeConnections";
import { RedisServiceWebSocketRequest, HttpServiceWebSocketRequest, HttpServiceWebSocketMessageRequest } from "../../../../types/webSocketRequests";
import respond from "../../respond";

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

      const onRequestResult = serviceConfig.onRequest
        ? await serviceConfig.onRequest(websocketRequest)
        : { handled: false as false, request: message };

      if (onRequestResult.handled) {
        respond(onRequestResult.response, conn, websocketConfig);
      } else {
        //TODO .... call service
      }
    }
  }
}
