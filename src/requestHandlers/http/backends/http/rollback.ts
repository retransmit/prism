import got from "got";

import { HttpRequest, HttpProxyConfig } from "../../../../types";

import * as configModule from "../../../../config";
import responseIsError from "../../../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import { HttpRouteConfig } from "../../../../types/httpRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";

/*
  Make Promises for Http Services
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  httpConfig: HttpProxyConfig
) {
  const config = configModule.get();
  const routeConfig = httpConfig.routes[request.path][
    request.method
  ] as HttpRouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http" && serviceConfig.config.rollbackUrl) {
      const params = request.params;
      const urlWithParamsReplaced = params
        ? Object.keys(params).reduce((acc, param) => {
            return acc.replace(`/:${param}`, `/${params[param]}`);
          }, serviceConfig.config.rollbackUrl)
        : serviceConfig.config.rollbackUrl;

      const requestCopy = {
        ...request,
        path: urlWithParamsReplaced,
      };

      const modifiedRequest = serviceConfig.config.onRollbackRequest
        ? await serviceConfig.config.onRollbackRequest(requestCopy)
        : { handled: false as false, request: requestCopy };

      if (!modifiedRequest.handled) {
        const options = makeGotOptions(
          modifiedRequest.request,
          serviceConfig.timeout
        );

        got(modifiedRequest.request.path, options).catch(async (error) => {
          const errorResponse = error.response
            ? makeHttpResponse(error.response)
            : {
                status: 400,
                content: error.message,
              };

          if (responseIsError(errorResponse)) {
            if (serviceConfig.config.onError) {
              serviceConfig.config.onError(errorResponse, modifiedRequest.request);
            }
          }
        });
      }
    }
  }
}
