import { HttpRequest, RouteConfig, RedisServiceRequest } from "../../types";
import * as configModule from "../../config";
import { getChannelForService } from "./getChannelForService";
import { getPublisher } from "./clients";

/*
  Make Promises for Redis Services.
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  httpRequest: HttpRequest
) {
  const config = configModule.get();
  const routeConfig = config.http.routes[httpRequest.path][
    httpRequest.method
  ] as RouteConfig;

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "redis") {
      const redisRequest: RedisServiceRequest = {
        id: requestId,
        request: httpRequest,
        responseChannel: serviceConfig.config.requestChannel,
        type: "rollback",
      };

      const requestChannel = getChannelForService(serviceConfig);

      if (!alreadyPublishedChannels.includes(requestChannel)) {
        const onRollbackRequestResult = serviceConfig.config.onRollbackRequest
          ? await serviceConfig.config.onRollbackRequest(redisRequest)
          : { handled: false as false, request: redisRequest };

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
