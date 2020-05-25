import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketResponse } from "../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../types";

export default function disconnect(
  conn: ActiveWebSocketConnection,
  terminatingService: string,
  message: WebSocketResponse,
  websocketConfig: WebSocketProxyConfig
) {

}
