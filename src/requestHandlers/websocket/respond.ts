import { WebSocketResponse } from "../../types/webSocketRequests";
import disconnect from "./disconnect";
import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

export default function respond(
  websocketResponse: WebSocketResponse,
  service: string,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  if (websocketResponse.type === "disconnect") {
    disconnect(conn, service, websocketResponse, websocketConfig);
  } else {
    if (websocketResponse.response) {
      conn.websocket.send(websocketResponse.response);
    }
  }
}
