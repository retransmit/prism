import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResult,
  TrackedRequest,
  ServiceHandlerConfig,
  RedisRequest,
  HttpRequest,
} from "../types";

import * as activeRequests from "./activeRequests";
import * as configModule from "../config";
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

  const toWait = Object.keys(routeConfig.services).filter(
    (serviceName) => routeConfig.services[serviceName].awaitResponse !== false
  );

  const promises = toWait.map((service) => {
    const channel = routeConfig.services[service].redis
      ?.responseChannel as string;
    return new Promise<FetchedResult>((success, error) => {
      activeRequests.set(`${requestId}+${service}`, {
        id: requestId,
        type: "redis",
        channel,
        path: httpRequest.path,
        method: httpRequest.method,
        service,
        timeoutTicks:
          Date.now() + (routeConfig.services[service].timeoutMS || 30000),
        startTime: Date.now(),
        onSuccess: success,
        onError: error,
      });
    });
  });

  return promises;
}
