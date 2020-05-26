import {
  WebSocketResponse,
  WebSocketRouteConfig,
  RedisServiceWebSocketRequest,
} from "../../types/webSocketRequests";
import disconnect from "./disconnect";
import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

export default async function respond(
  websocketResponse: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  if (websocketResponse.type === "message") {
    const routeConfig = websocketConfig.routes[websocketResponse.route];
    const serviceConfig = routeConfig.services[websocketResponse.service];
    const onResponse =
      serviceConfig.onResponse ||
      routeConfig.onResponse ||
      websocketConfig.onResponse;

    const finalResponse = onResponse
      ? await onResponse(websocketResponse)
      : websocketResponse;

    if (finalResponse.type === "disconnect") {
      disconnect(websocketResponse, conn, websocketConfig);
    } else if (finalResponse.type === "message") {
      if (finalResponse.response) {
        conn.websocket.send(websocketResponse.response);
      }
    }
  } else if (websocketResponse.type === "disconnect") {
    disconnect(websocketResponse, conn, websocketConfig);
  }
}
