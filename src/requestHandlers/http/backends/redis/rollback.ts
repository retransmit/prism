import { HttpRequest, HttpProxyConfig } from "../../../../types";
import * as configModule from "../../../../config";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { getPublisher } from "../../../../lib/redis/clients";
import {
  HttpRouteConfig,
  RedisServiceHttpRequest,
} from "../../../../types/httpRequests";

/*
  Make Promises for Redis Services.
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  httpConfig: HttpProxyConfig
) {
  const config = configModule.get();
  const routeConfig = httpConfig.routes[request.path][
    request.method
  ] as HttpRouteConfig;

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "redis") {
      const redisHttpRequest: RedisServiceHttpRequest = {
        id: requestId,
        request: request,
        responseChannel: `${httpConfig.redis?.responseChannel}.${config.instanceId}`,
        type: "rollback",
      };

      const requestChannel = getChannelForService(
        serviceConfig.config.requestChannel,
        serviceConfig.config.numRequestChannels
      );

      if (!alreadyPublishedChannels.includes(requestChannel)) {
        const onRollbackRequestResult = serviceConfig.config.onRollbackRequest
          ? await serviceConfig.config.onRollbackRequest(redisHttpRequest)
          : { handled: false as false, request: redisHttpRequest };

        if (!onRollbackRequestResult.handled) {
          alreadyPublishedChannels.push(requestChannel);

          getPublisher().publish(
            requestChannel,
            JSON.stringify(onRollbackRequestResult.request)
          );
        }
      }
    }
  }
}
