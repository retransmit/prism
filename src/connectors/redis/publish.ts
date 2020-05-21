import * as configModule from "../../config";
import {
  HttpMethods,
  RouteConfig,
  HttpRequest,
  RedisServiceRequest,
} from "../../types";
import { getPublisher } from "./clients";

export function publish(
  requestId: string,
  request: HttpRequest,
  requestType: "request" | "rollback"
) {
  const config = configModule.get();
  const routeConfig = config.routes[request.path][
    request.method
  ] as RouteConfig;

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "redis") {
      const redisRequest: RedisServiceRequest = {
        id: requestId,
        request: request,
        responseChannel: serviceConfig.config.requestChannel,
        type: requestType,
      };
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
            ? modifyServiceRequest(redisRequest)
            : redisRequest;

          getPublisher().publish(channelId, JSON.stringify(requestToSend));
          alreadyPublishedChannels.push(channelId);
        }
      }
    }
  }
}
