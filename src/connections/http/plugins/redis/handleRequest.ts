import { AppConfig, HttpProxyAppConfig } from "../../../../types/config";

import { get as activeRequests } from "./activeRequests";
import {
  InvokeHttpServiceResult,
  HttpServiceEndPointConfig,
  RedisHttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../../../types/config/httpProxy";
import { publish } from "./publish";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";
import {
  HttpRequest,
  HttpMethods,
  FetchedHttpResponse,
  RedisHttpRequest,
} from "../../../../types/http";

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
  config: HttpProxyAppConfig
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
            responseChannel: `${config.http.redis.responseChannel}.${config.instanceId}`,
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
              const fetchedResponse = {
                type: "redis" as "redis",
                id: requestId,
                route,
                method,
                path: request.path,
                service,
                time: Date.now() - timeBeforeOnRequestResult,
                response: onRequestResult.response,
                stage,
              };
              success({
                skip: false,
                response: fetchedResponse,
              });
            } else {
              success({ skip: true });
            }
          } else {
            if (serviceConfig.awaitResponse !== false) {
              if (
                !alreadyPublishedChannels.includes(serviceConfig.requestChannel)
              ) {
                alreadyPublishedChannels.push(serviceConfig.requestChannel);
                publish(serviceConfig.requestChannel, onRequestResult.request);
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
              if (
                !alreadyPublishedChannels.includes(serviceConfig.requestChannel)
              ) {
                publish(serviceConfig.requestChannel, onRequestResult.request);
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
