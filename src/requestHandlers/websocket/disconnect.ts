import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketResponse } from "../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../types";

export default function disconnect(
  message: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {

}
