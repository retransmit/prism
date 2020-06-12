import {
  HttpRequestHandlerConfig,
  HttpRequest,
  RedisServiceHttpRequestHandlerConfig,
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
} from "../../../../types/http";

/*
  Make Promises for Redis Services
*/
export default function handleRequest(
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
        [service, routeConfig.services[service]] as [string, HttpRequestHandlerConfig]
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
          const onRequestResult = serviceConfig.onRequest
            ? await serviceConfig.onRequest(redisHttpRequest)
            : {
                handled: false as false,
                request: JSON.stringify(redisHttpRequest),
              };

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
              serviceConfig.requestChannel,
              serviceConfig.numRequestChannels
            );
            if (serviceConfig.awaitResponse !== false) {
              if (!alreadyPublishedChannels.includes(requestChannel)) {
                alreadyPublishedChannels.push(requestChannel);
                getPublisher().publish(requestChannel, onRequestResult.request);
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
                getPublisher().publish(requestChannel, onRequestResult.request);
              }
              success({ skip: true });
            }
          }
        })
    );
}

function isRedisServiceConfig(
  x: [string, HttpRequestHandlerConfig]
): x is [string, RedisServiceHttpRequestHandlerConfig] {
  return x[1].type === "redis";
}
