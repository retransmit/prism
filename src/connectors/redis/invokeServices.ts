import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResult,
  ActiveRedisRequest,
  ServiceHandlerConfig,
  RedisRequest,
  HttpRequest,
} from "../../types";

import * as activeRequests from "./activeRequests";
import * as configModule from "../../config";
import { publish } from "./publish";
/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  httpRequest: HttpRequest
): Promise<FetchedResult>[] {
  const config = configModule.get();
  const routeConfig = config.routes[httpRequest.path][
    httpRequest.method
  ] as RouteConfig;

  const redisRequest = {
    id: requestId,
    type: "request" as "request",
    data: httpRequest,
  };

  publish(redisRequest, httpRequest.path, httpRequest.method);

  const promises: Promise<FetchedResult>[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (
      serviceConfig.type === "redis" &&
      serviceConfig.awaitResponse !== false
    ) {
      promises.push(
        new Promise<FetchedResult>((success, error) => {
          activeRequests.set(`${requestId}+${service}`, {
            id: requestId,
            responseChannel: serviceConfig.config.responseChannel,
            path: httpRequest.path,
            method: httpRequest.method,
            service,
            timeoutTicks:
              Date.now() + (routeConfig.services[service].timeoutMS || 30000),
            startTime: Date.now(),
            onSuccess: success,
            onError: error,
          });
        })
      );
    }
  }

  return promises;
}
