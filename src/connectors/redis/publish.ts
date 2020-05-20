import * as configModule from "../../config";
import {
  HttpMethods,
  RouteConfig,
  HttpRequest,
  RedisServiceRequest,
} from "../../types";
import { getPublisher } from "./clients";

export async function publish(
  request: RedisServiceRequest,
  path: string,
  method: HttpMethods,
  requestType: "request" | "rollback"
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
          const modifyServiceRequest =
            requestType === "request"
              ? serviceConfig.config.modifyServiceRequest
              : requestType === "rollback"
              ? serviceConfig.config.modifyRollbackRequest
              : undefined;
          const requestToSend = modifyServiceRequest
            ? modifyServiceRequest(request)
            : request;

          getPublisher().publish(channelId, JSON.stringify(requestToSend));
          alreadyPublishedChannels.push(channelId);
        }
      }
    }
  }
}
