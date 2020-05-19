import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResponse,
  ActiveRedisRequest,
  ServiceHandlerConfig,
  RedisServiceRequest,
  HttpRequest,
} from "../../types";

import * as configModule from "../../config";
/*
  Make Promises for Redis Services
*/
export default function rollback(requestId: string, httpRequest: HttpRequest) {
  const config = configModule.get();
  const routeConfig = config.routes[httpRequest.path][
    httpRequest.method
  ] as RouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http") {
      // TODO call all urls
    }
  }
}
