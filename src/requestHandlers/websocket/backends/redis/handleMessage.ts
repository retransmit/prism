import * as configModule from "../../../../config";
import {
  WebSocketRouteConfig,
  RedisServiceWebSocketHandlerConfig,
} from "../../../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../../../types";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function handleMessage(
  requestId: string,
  message: string,
  route: string,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[route];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "redis") {
      const requestChannel = getChannelForService(
        serviceConfig.config.requestChannel,
        serviceConfig.config.numRequestChannels
      );

      const alreadyPublishedChannels: string[] = [];

      if (serviceConfig.type === "redis") {
        if (!alreadyPublishedChannels.includes(requestChannel)) {
          alreadyPublishedChannels.push(requestChannel);
          getPublisher().publish(requestChannel, "");
        }
      }
    }
  }
}
