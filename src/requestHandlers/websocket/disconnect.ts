import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketProxyConfig } from "../../types";

import httpDisconnect from "./backends/http/disconnect";
import redisDisconnect from "./backends/redis/disconnect";

export default function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const route = conn.route;
  for (const service of Object.keys(websocketConfig.routes[conn.route])) {
    const serviceConfig = websocketConfig.routes[route].services[service];
    if (serviceConfig.type === "redis") {
      redisDisconnect(requestId, conn, serviceConfig, websocketConfig);
    } else if (serviceConfig.type === "http") {
      httpDisconnect(requestId, conn, serviceConfig, websocketConfig);
    }
  }
}
