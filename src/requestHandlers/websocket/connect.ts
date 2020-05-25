import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

export default function connect(
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const services = Object.keys(websocketConfig.routes[conn.route].services);
  
  for (const service of services) {
    
  }
}
