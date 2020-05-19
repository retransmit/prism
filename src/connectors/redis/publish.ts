import * as configModule from "../../config";
import {
  HttpMethods,
  RouteConfig,
  HttpRequest,
  RedisRequest,
} from "../../types";
import { getPublisher } from "./clients";

export async function publish(
  request: RedisRequest,
  path: string,
  method: HttpMethods
) {
  const config = configModule.get();
  const routeConfig = config.routes[path][method] as RouteConfig;

  const alreadyPublishedChannels: string[] = [];
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "redis") {
      const channel = serviceConfig.config.requestChannel;
      if (channel) {
        const channelId = !serviceConfig.config.numRequestChannels
          ? channel
          : `${channel}${Math.floor(
              Math.random() * serviceConfig.config.numRequestChannels
            )}`;
        if (!alreadyPublishedChannels.includes(channelId)) {
          const requestHandler = serviceConfig.config.handlers?.request;
          const requestToSend = requestHandler
            ? requestHandler(request)
            : request;
          getPublisher().publish(channelId, JSON.stringify(requestToSend));
          alreadyPublishedChannels.push(channelId);
        }
      }
    }
  }
}
