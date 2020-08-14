import { WebSocketProxyAppConfig } from "../../types/config";
import {
  ActiveWebSocketConnection,
  WebSocketServiceResponse,
} from "../../types/webSocket";
import { get as activeConnections } from "./activeConnections";

export default async function respondToWebSocketClient(
  webSocketResponse: WebSocketServiceResponse,
  conn: ActiveWebSocketConnection,
  config: WebSocketProxyAppConfig
) {
  const routeConfig = config.webSocket.routes[conn.route];

  const onResponse = routeConfig.onResponse || config.webSocket.onResponse;

  const onResponseResult =
    (onResponse && (await onResponse(webSocketResponse))) || webSocketResponse;

  if (onResponseResult.type === "message") {
  } else if (onResponseResult.type === "drop") {
    if (onResponseResult.message) {
      conn.webSocket.send(onResponseResult.message);
    }
    activeConnections().delete(webSocketResponse.id);
    conn.webSocket.terminate();
  }
}
