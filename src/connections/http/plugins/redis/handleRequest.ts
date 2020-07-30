import { AppConfig } from "../../../../types";

import { get as activeRequests } from "./activeRequests";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import {
  RedisHttpRequest,
  InvokeHttpServiceResult,
  FetchedHttpResponse,
  HttpServiceEndPointConfig,
  RedisHttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../../../types/httpProxy";
import { publish } from "./publish";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";
import { HttpRequest, HttpMethods } from "../../../../types/http";

/*
  Make Promises for Redis Services
*/
export default function handleRequest(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  stage: number | undefined,
  fetchedResponses: FetchedHttpResponse[],
  servicesInStage: {
    [name: string]: HttpServiceEndPointConfig;
  },
  routeConfig: HttpRouteConfig,
  config: AppConfig
): Promise<InvokeHttpServiceResult>[] {
  const alreadyPublishedChannels: string[] = [];

  return Object.keys(servicesInStage)
    .map(
      (service) =>
        [service, servicesInStage[service]] as [
          string,
          HttpServiceEndPointConfig
        ]
    )
    .filter(isRedisServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const httpRequestWithMappedFields = mapBodyAndHeaders(
            request,
            serviceConfig
          );

          const redisHttpRequest: RedisHttpRequest = {
            id: requestId,
            request: httpRequestWithMappedFields,
            responseChannel: `${config.http?.redis?.responseChannel}.${config.instanceId}`,
            type: "request",
          };

          const timeBeforeOnRequestResult = Date.now();

          const onRequestResult = (serviceConfig.onRequest &&
            (await serviceConfig.onRequest(
              redisHttpRequest,
              fetchedResponses
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
                  route,
                  method,
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
                route,
                method,
                request: request,
                service,
                timeoutAt: Date.now() + (serviceConfig.timeout || 30000),
                startTime: Date.now(),
                onResponse: success,
                stage,
                responses: fetchedResponses,
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
  x: [string, HttpServiceEndPointConfig]
): x is [string, RedisHttpServiceEndPointConfig] {
  return x[1].type === "redis";
}
