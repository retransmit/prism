import {
  RouteConfig,
  ServiceConfig,
  RedisServiceRequest,
  HttpRequest,
  RedisServiceConfig,
} from "../../../../types";

import activeRequests from "./activeRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "./clients";
import { InvokeServiceResult } from "../../../../handler";
import { getChannelForService } from "./getChannelForService";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  httpRequest: HttpRequest
): Promise<InvokeServiceResult>[] {
  const config = configModule.get();
  const routeConfig = config.http.routes[httpRequest.path][
    httpRequest.method
  ] as RouteConfig;

  // publish(requestId, httpRequest, "request");

  const alreadyPublishedChannels: string[] = [];

  return Object.keys(routeConfig.services)
    .map(
      (service) =>
        [service, routeConfig.services[service]] as [string, ServiceConfig]
    )
    .filter(isRedisServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const redisRequest: RedisServiceRequest = {
            id: requestId,
            request: httpRequest,
            responseChannel: serviceConfig.config.responseChannel,
            type: "request",
          };

          const onRequestResult = serviceConfig.config.onRequest
            ? await serviceConfig.config.onRequest(redisRequest)
            : { handled: false as false, request: redisRequest };

          const requestChannel = getChannelForService(serviceConfig);
          if (onRequestResult.handled) {
            success({ skip: true });
          } else {
            if (serviceConfig.awaitResponse !== false) {
              if (!alreadyPublishedChannels.includes(requestChannel)) {
                alreadyPublishedChannels.push(requestChannel);
                getPublisher().publish(
                  requestChannel,
                  JSON.stringify(onRequestResult.request)
                );
              }
              activeRequests.set(`${requestId}+${service}`, {
                id: requestId,
                responseChannel: serviceConfig.config.responseChannel,
                request: httpRequest,
                service,
                timeoutAt: Date.now() + (serviceConfig.timeout || 30000),
                startTime: Date.now(),
                onResponse: success,
              });
            } else {
              if (!alreadyPublishedChannels.includes(requestChannel)) {
                getPublisher().publish(
                  requestChannel,
                  JSON.stringify(onRequestResult.request)
                );
              }
              success({ skip: true });
            }
          }
        })
    );
}

function isRedisServiceConfig(
  x: [string, ServiceConfig]
): x is [string, RedisServiceConfig] {
  return x[1].type === "redis";
}
