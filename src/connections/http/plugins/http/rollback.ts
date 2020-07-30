import got from "got";

import { AppConfig, HttpProxyAppConfig } from "../../../../types";

import responseIsError from "../../../../utils/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import {
  HttpRouteConfig,
  NativeHttpServiceEndPointConfig,
} from "../../../../types/httpProxy";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import { replaceParamsInUrl } from "./replaceParamsInUrl";
import { HttpRequest, HttpMethods } from "../../../../types/http";

/*
  Make Promises for Http Services
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  config: HttpProxyAppConfig
) {
  const routeConfig = config.http.routes[route][method] as HttpRouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http" && serviceConfig.rollback) {
      const rollbackRequest = serviceConfig.rollback(request);

      if (rollbackRequest) {
        doRollback(rollbackRequest, request, serviceConfig);
      }
    }
  }
}

async function doRollback(
  rollbackRequest: HttpRequest,
  request: HttpRequest,
  serviceConfig: NativeHttpServiceEndPointConfig
) {
  const params = request.params;

  const urlWithParamsReplaced = replaceParamsInUrl(
    params,
    rollbackRequest.path
  );

  const requestWithPathParams = {
    ...rollbackRequest,
    path: urlWithParamsReplaced,
  };

  const modifiedRequest = (serviceConfig.onRollbackRequest &&
    (await serviceConfig.onRollbackRequest(requestWithPathParams))) || {
    handled: false as false,
    request: requestWithPathParams,
  };

  if (!modifiedRequest.handled) {
    const options = makeGotOptions(
      modifiedRequest.request,
      serviceConfig.rollbackRequestContentEncoding,
      serviceConfig.rollbackRequestContentType,
      serviceConfig.timeout
    );

    got(modifiedRequest.request.path, options).catch(async (error) => {
      const errorResponse = error.response
        ? makeHttpResponse(error.response)
        : {
            status: 400,
            body: error.message,
          };

      if (responseIsError(errorResponse)) {
        if (serviceConfig.onError) {
          serviceConfig.onError(errorResponse, modifiedRequest.request);
        }
      }
    });
  }
}
