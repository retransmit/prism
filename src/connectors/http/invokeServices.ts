import {
  HttpMethods,
  RouteConfig,
  FetchedResult,
  HttpRequest,
} from "../../types";

import * as activeRequests from "../redis/activeRequests";
import * as configModule from "../../config";
import got from "got";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest
): Promise<FetchedResult>[] {
  const config = configModule.get();
  const path = request.path;
  const method = request.method;
  const routeConfig = config.routes[path][method] as RouteConfig;

  // const promises: Promise<FetchedResult>[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http") {
      const url = serviceConfig.config.url;

      if (url) {
        const basicOptions = {
          searchParams: request.query,
          method: method,
          headers: request.headers,
          timeout: routeConfig.services[service].timeoutMS,
        };

        const options =
          typeof request.body === "string"
            ? {
                ...basicOptions,
                body: request.body,
              }
            : typeof request.body === "object"
            ? {
                ...basicOptions,
                json: request.body,
              }
            : basicOptions;

        if (routeConfig.services[service].awaitResponse !== false) {
          // promises.push(
          //   new Promise((success, failure) => {
          //     got(url, basicOptions);
          //   })
          // );
        } else {
          got(url, basicOptions);
        }
      }
    }
  }

  // publish(payload, path, method);
  const toWait = Object.keys(routeConfig.services).filter(
    (serviceName) => routeConfig.services[serviceName].awaitResponse !== false
  );

  // const promises = toWait.map((service) => {
  //   const channel = routeConfig.services[service].redis
  //     ?.responseChannel as string;
  //   return new Promise<FetchedResult>((success, error) => {
  //     activeRequests.set(`${requestId}+${service}`, {
  //       id: requestId,
  //       type: "redis",
  //       channel,
  //       path,
  //       method,
  //       service,
  //       timeoutTicks:
  //         Date.now() + (routeConfig.services[service].timeoutMS || 30000),
  //       startTime: Date.now(),
  //       onSuccess: success,
  //       onError: error,
  //     });
  //   });
  // });

  return [];
}
