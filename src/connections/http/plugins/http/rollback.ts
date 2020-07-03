import got from "got";

import {
  HttpRequest,
  HttpMethods,
  AppConfig,
  HttpServiceAppConfig,
} from "../../../../types";

import responseIsError from "../../../../utils/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import {
  HttpRouteConfig,
  HttpServiceHttpRequestHandlerConfig,
} from "../../../../types/http";
import { makeGotOptions } from "../../../../utils/http/gotUtil";

/*
  Make Promises for Http Services
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  config: HttpServiceAppConfig
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
  serviceConfig: HttpServiceHttpRequestHandlerConfig
) {
  const params = request.params;

  const urlWithParamsReplaced = params
    ? Object.keys(params).reduce((acc, param) => {
        return acc.replace(`/:${param}`, `/${params[param]}`);
      }, rollbackRequest.path)
    : rollbackRequest.path;

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
      serviceConfig.rollbackRequestEncoding,
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
