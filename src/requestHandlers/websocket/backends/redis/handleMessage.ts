import * as configModule from "../../../../config";
import {
  WebSocketRouteConfig,
  RedisServiceWebSocketHandlerConfig,
} from "../../../../types/webSocketRequests";

export default function handleMessage(
  requestId: string,
  message: string,
  route: string
) {
  const config = configModule.get();

  if (config.websockets) {
    const routeConfig = config.websockets.routes[route];

    const redisServices = Object.keys(routeConfig.services).filter(
      (service) => routeConfig.services[service].type === "redis"
    );

    for (const service of redisServices) {
      const serviceConfig = routeConfig.services[
        service
      ] as RedisServiceWebSocketHandlerConfig;

      
    }
  }
}
