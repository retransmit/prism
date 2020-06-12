import { WebSocketResponse } from "../../types/webSocketRequests";
import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

export default async function respondToWebSocketClient(
  requestId: string,
  webSocketResponse: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  webSocketConfig: WebSocketProxyConfig
) {
  const routeConfig = webSocketConfig.routes[webSocketResponse.route];

  const onResponse = routeConfig.onResponse || webSocketConfig.onResponse;

  const onResponseResult = onResponse
    ? await onResponse(requestId, webSocketResponse)
    : webSocketResponse;

  if (onResponseResult.type === "message") {
    if (onResponseResult.response) {
      conn.webSocket.send(webSocketResponse.response);
    }
  } else if (onResponseResult.type === "disconnect") {
    conn.webSocket.terminate();
  }
}
