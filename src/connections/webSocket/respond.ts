import {
  WebSocketResponse,
  ActiveWebSocketConnection,
} from "../../types/config/webSocketProxy";
import { WebSocketProxyAppConfig } from "../../types/config";

export default async function respondToWebSocketClient(
  requestId: string,
  webSocketResponse: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  config: WebSocketProxyAppConfig
) {
  const routeConfig = config.webSocket.routes[conn.route];

  const onResponse = routeConfig.onResponse || config.webSocket.onResponse;

  const onResponseResult =
    (onResponse && (await onResponse(requestId, webSocketResponse))) ||
    webSocketResponse;

  if (onResponseResult.type === "message") {
    if (onResponseResult.response) {
      conn.webSocket.send(webSocketResponse.response);
    }
  } else if (onResponseResult.type === "disconnect") {
    conn.webSocket.terminate();
  }
}
