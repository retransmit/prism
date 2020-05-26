import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketResponse } from "../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../types";

import httpDisconnect from "./backends/http/disconnect";
import redisDisconnect from "./backends/redis/disconnect";

export default function disconnect(
  message: WebSocketResponse,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const route = conn.route;
  for (const service of Object.keys(websocketConfig.routes[conn.route])) {
    const serviceConfig = websocketConfig.routes[route].services[service];
    if (serviceConfig.type === "redis") {
      redisDisconnect(message.id, conn.route, serviceConfig, websocketConfig);
    } else if (serviceConfig.type === "http") {
      httpDisconnect(message.id, conn.route, serviceConfig, websocketConfig);
    }
  }
}
