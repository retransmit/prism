import { ActiveWebSocketConnection } from "./activeConnections";
import { WebSocketResponse } from "../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../types";

import httpConnect from "./backends/http/connect";
import redisConnect from "./backends/redis/connect";

export default function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const route = conn.route;
  for (const service of Object.keys(websocketConfig.routes[conn.route])) {
    const serviceConfig = websocketConfig.routes[route].services[service];
    if (serviceConfig.type === "http") {
      httpConnect(requestId, conn.route, serviceConfig, websocketConfig);
    } else if (serviceConfig.type === "redis") {
      redisConnect(requestId, conn.route, serviceConfig, websocketConfig);
    }
  }
}
