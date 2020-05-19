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

import * as configModule from "../config";
/*
  Make Promises for Redis Services
*/
export default function rollback(requestId: string, httpRequest: HttpRequest) {
  const config = configModule.get();
  const routeConfig = config.routes[httpRequest.path][
    httpRequest.method
  ] as RouteConfig;

  const toWait = Object.keys(routeConfig.services).filter(
    (serviceName) => routeConfig.services[serviceName].awaitResponse !== false
  );

  const promises = toWait.map((service) => {
    const channel = routeConfig.services[service].redis
      ?.responseChannel as string;
    return new Promise<FetchedResult>((success, error) => {});
  });
}
