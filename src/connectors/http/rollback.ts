import got from "got";

import { RouteConfig, HttpRequest } from "../../types";

import * as configModule from "../../config";
/*
  Make Promises for Redis Services
*/
export default function rollback(requestId: string, request: HttpRequest) {
  const config = configModule.get();
  const routeConfig = config.routes[request.path][
    request.method
  ] as RouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http" && serviceConfig.config.rollbackUrl) {
      const requestCopy = {
        ...request,
        path: serviceConfig.config.rollbackUrl,
      };

      const modifiedRequest = serviceConfig.config.modifyServiceRequest
        ? serviceConfig.config.modifyServiceRequest(requestCopy)
        : requestCopy;

      const basicOptions = {
        searchParams: modifiedRequest.query,
        method: modifiedRequest.method,
        headers: modifiedRequest.headers,
        timeout: serviceConfig.timeout,
      };

      const options =
        typeof modifiedRequest.body === "string"
          ? {
              ...basicOptions,
              body: modifiedRequest.body,
            }
          : typeof modifiedRequest.body === "object"
          ? {
              ...basicOptions,
              json: modifiedRequest.body,
            }
          : basicOptions;

      got(modifiedRequest.path, options);
    }
  }
}
