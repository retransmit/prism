import got from "got";

import { RouteConfig, HttpRequest } from "../../types";

import * as configModule from "../../config";
import responseIsError from "../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
/*
  Make Promises for Redis Services
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest
) {
  const config = configModule.get();
  const routeConfig = config.routes[request.path][
    request.method
  ] as RouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http" && serviceConfig.config.rollbackUrl) {
      const urlWithParamsReplaced = Object.keys(request.params).reduce(
        (acc, param) => {
          return acc.replace(`/:${param}`, `/${request.params[param]}`);
        },
        serviceConfig.config.rollbackUrl
      );
      const requestCopy = {
        ...request,
        path: urlWithParamsReplaced,
      };

      const modifiedRequest = serviceConfig.config.onServiceRequest
        ? await serviceConfig.config.onServiceRequest(requestCopy)
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

      got(modifiedRequest.path, options).catch(async (error) => {
        const httpResponse = makeHttpResponse(error.response);

        if (responseIsError(httpResponse)) {
          if (serviceConfig.onError) {
            serviceConfig.onError(httpResponse, modifiedRequest);
          }
        }
      });
    }
  }
}
