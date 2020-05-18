import { HttpMethods, RouteConfig, FetchedResult } from "../types";

import * as activeRequests from "../activeRequests";
import * as configModule from "../config";
import got = require("got");

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  payload: any,
  requestId: string,
  path: string,
  method: HttpMethods
): Promise<FetchedResult>[] {
  const config = configModule.get();
  const routeConfig = config.routes[path][method] as RouteConfig;

  
  // publish(payload, path, method);

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
        path,
        method,
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
