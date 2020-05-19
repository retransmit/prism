import got from "got";

import { RouteConfig, HttpRequest } from "../../types";

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
    if (serviceConfig.type === "http" && serviceConfig.config.rollbackUrl) {
      const basicOptions = {
        searchParams: httpRequest.query,
        method: httpRequest.method,
        headers: httpRequest.headers,
        timeout: serviceConfig.timeoutMS,
      };

      const options =
        typeof httpRequest.body === "string"
          ? {
              ...basicOptions,
              body: httpRequest.body,
            }
          : typeof httpRequest.body === "object"
          ? {
              ...basicOptions,
              json: httpRequest.body,
            }
          : basicOptions;

      got(serviceConfig.config.rollbackUrl, options);
    }
  }
}
