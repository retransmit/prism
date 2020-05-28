import {
  HttpHandlerConfig,
  HttpRequest,
  RedisServiceHttpHandlerConfig,
  HttpProxyConfig,
} from "../../../../types";

import { get as activeRequests } from "./activeRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import {
  HttpRouteConfig,
  RedisServiceHttpRequest,
  InvokeServiceResult,
} from "../../../../types/httpRequests";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest,
  httpConfig: HttpProxyConfig
): Promise<InvokeServiceResult>[] {
  const config = configModule.get();
  const routeConfig = httpConfig.routes[request.path][
    request.method
  ] as HttpRouteConfig;

  const alreadyPublishedChannels: string[] = [];

  return Object.keys(routeConfig.services)
    .map(
      (service) =>
        [service, routeConfig.services[service]] as [string, HttpHandlerConfig]
    )
    .filter(isRedisServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const redisHttpRequest: RedisServiceHttpRequest = {
            id: requestId,
            request: request,
            responseChannel: `${httpConfig.redis?.responseChannel}.${config.instanceId}`,
            type: "request",
          };

          const timeBeforeOnRequestResult = Date.now();
          const onRequestResult = serviceConfig.config.onRequest
            ? await serviceConfig.config.onRequest(redisHttpRequest)
            : { handled: false as false, request: redisHttpRequest };

          if (onRequestResult.handled) {
            if (serviceConfig.awaitResponse !== false) {
              success({
                skip: false,
                response: {
                  type: "redis",
                  id: requestId,
                  method: request.method,
                  path: request.path,
                  service,
                  time: Date.now() - timeBeforeOnRequestResult,
                  response: onRequestResult.response,
                },
              });
            } else {
              success({ skip: true });
            }
          } else {
            const requestChannel = getChannelForService(
              serviceConfig.config.requestChannel,
              serviceConfig.config.numRequestChannels
            );
            if (serviceConfig.awaitResponse !== false) {
              if (!alreadyPublishedChannels.includes(requestChannel)) {
                alreadyPublishedChannels.push(requestChannel);
                getPublisher().publish(
                  requestChannel,
                  JSON.stringify(onRequestResult.request)
                );
              }
              activeRequests().set(`${requestId}+${service}`, {
                id: requestId,
                request: request,
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
  x: [string, HttpHandlerConfig]
): x is [string, RedisServiceHttpHandlerConfig] {
  return x[1].type === "redis";
}
