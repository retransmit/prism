import * as configModule from "../config";
import { HttpMethods, RouteConfig } from "../types";
import { getPublisher } from "./clients";

export async function publish(payload: any, path: string, method: HttpMethods) {
  const config = configModule.get();
  const routeConfig = config.routes[path][method] as RouteConfig;

  const alreadyPublishedChannels: string[] = [];
  for (const service of Object.keys(routeConfig.services)) {
    const redisOptions = routeConfig.services[service].redis;
    if (redisOptions) {
      const channel = redisOptions.requestChannel;
      if (channel) {
        const channelId = !redisOptions.numRequestChannels
          ? channel
          : `${channel}${Math.floor(
              Math.random() * redisOptions.numRequestChannels
            )}`;
        if (!alreadyPublishedChannels.includes(channelId)) {
          getPublisher().publish(channelId, JSON.stringify(payload));
          alreadyPublishedChannels.push(channelId);
        }
      }
    }
  }
}
