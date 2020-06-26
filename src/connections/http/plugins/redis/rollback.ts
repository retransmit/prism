import { HttpRequest, HttpProxyConfig } from "../../../../types";
import * as configModule from "../../../../config";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import {
  HttpRouteConfig,
  RedisServiceHttpRequest,
} from "../../../../types/http";
import { publish } from "./publish";

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
        type: "rollback",
      };

      const requestChannel = getChannelForService(
        serviceConfig.requestChannel,
        serviceConfig.numRequestChannels
      );

      if (!alreadyPublishedChannels.includes(requestChannel)) {
        const onRollbackRequestResult = (serviceConfig.onRollbackRequest &&
          (await serviceConfig.onRollbackRequest(redisHttpRequest))) || {
          handled: false as false,
          request: JSON.stringify(redisHttpRequest),
        };

        if (!onRollbackRequestResult.handled) {
          alreadyPublishedChannels.push(requestChannel);

          publish(requestChannel, onRollbackRequestResult.request);
        }
      }
    }
  }
}
