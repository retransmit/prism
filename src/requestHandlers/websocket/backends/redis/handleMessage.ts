import * as configModule from "../../../../config";
import {
  WebSocketRouteConfig,
  RedisServiceWebSocketHandlerConfig,
} from "../../../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../../../types";

export default function handleMessage(
  requestId: string,
  message: string,
  route: string,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[route];

  const redisServices = Object.keys(routeConfig.services).filter(
    (service) => routeConfig.services[service].type === "redis"
  );

  for (const service of redisServices) {
    const serviceConfig = routeConfig.services[
      service
    ] as RedisServiceWebSocketHandlerConfig;
  }
}
