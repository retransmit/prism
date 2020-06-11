import { WebSocketResponse } from "../../types/webSocketRequests";
import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

export default async function respondToWebSocketClient(
  requestId: string,
  websocketResponse: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[websocketResponse.route];

  const onResponse = routeConfig.onResponse || websocketConfig.onResponse;

  const onResponseResult = onResponse
    ? await onResponse(requestId, websocketResponse)
    : websocketResponse;

  if (onResponseResult.type === "message") {
    if (onResponseResult.response) {
      conn.webSocket.send(websocketResponse.response);
    }
  } else if (onResponseResult.type === "disconnect") {
    conn.webSocket.terminate();
  }
}
