import {
  HttpRequestHandlerConfig,
  HttpRequest,
  RedisServiceHttpRequestHandlerConfig,
  HttpProxyConfig,
} from "../../../../types";

import { get as activeRequests } from "./activeRequests";
import * as configModule from "../../../../config";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import {
  RedisServiceHttpRequest,
  InvokeServiceResult,
  FetchedHttpRequestHandlerResponse,
} from "../../../../types/http";
import { publish } from "./publish";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";

/*
  Make Promises for Redis Services
*/
export default function handleRequest(
  requestId: string,
  request: HttpRequest,
  stage: number | undefined,
  otherResponses: FetchedHttpRequestHandlerResponse[],
  services: {
    [name: string]: HttpRequestHandlerConfig;
  },
  httpConfig: HttpProxyConfig
): Promise<InvokeServiceResult>[] {
  const config = configModule.get();

  const alreadyPublishedChannels: string[] = [];

  return Object.keys(services)
    .map(
      (service) =>
        [service, services[service]] as [string, HttpRequestHandlerConfig]
    )
    .filter(isRedisServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const httpRequestWithMappedFields = mapBodyAndHeaders(
            request,
            serviceConfig
          );

          const redisHttpRequest: RedisServiceHttpRequest = {
            id: requestId,
            request: httpRequestWithMappedFields,
            responseChannel: `${httpConfig.redis?.responseChannel}.${config.instanceId}`,
            type: "request",
          };

          const timeBeforeOnRequestResult = Date.now();

          const onRequestResult = (serviceConfig.onRequest &&
            (await serviceConfig.onRequest(
              redisHttpRequest,
              otherResponses
            ))) || {
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
                  stage,
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
                publish(requestChannel, onRequestResult.request);
              }
              activeRequests().set(`${requestId}+${service}`, {
                id: requestId,
                request: request,
                service,
                timeoutAt: Date.now() + (serviceConfig.timeout || 30000),
                startTime: Date.now(),
                onResponse: success,
                stage,
                responses: otherResponses,
              });
            } else {
              if (!alreadyPublishedChannels.includes(requestChannel)) {
                publish(requestChannel, onRequestResult.request);
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
