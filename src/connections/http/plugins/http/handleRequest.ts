import {
  HttpRequest,
  HttpResponse,
  HttpServiceHttpRequestHandlerConfig,
  HttpRequestHandlerConfig,
  HttpProxyConfig,
} from "../../../../types";

import * as configModule from "../../../../config";
import got from "got";
import responseIsError from "../../../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import {
  HttpRouteConfig,
  FetchedHttpRequestHandlerResponse,
  InvokeServiceResult,
} from "../../../../types/http";
import { makeGotOptions } from "../../../../lib/http/gotUtil";

/*
  Make Promises for Http Services
*/
export default function handleRequest(
  requestId: string,
  originalRequest: HttpRequest,
  httpConfig: HttpProxyConfig
): Promise<InvokeServiceResult>[] {
  const path = originalRequest.path;
  const method = originalRequest.method;
  const routeConfig = httpConfig.routes[path][method] as HttpRouteConfig;

  return Object.keys(routeConfig.services)
    .map(
      (service) =>
        [service, routeConfig.services[service]] as [string, HttpRequestHandlerConfig]
    )
    .filter(isHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const timeNow = Date.now();
          const params = originalRequest.params || {};
          const urlWithParamsReplaced = params
            ? Object.keys(params).reduce((acc, param) => {
                return acc.replace(`/:${param}`, `/${params[param]}`);
              }, serviceConfig.url)
            : serviceConfig.url;

          const requestWithEditedPath = {
            ...originalRequest,
            path: urlWithParamsReplaced,
          };

          const onRequestResult = serviceConfig.onRequest
            ? await serviceConfig.onRequest(requestWithEditedPath)
            : { handled: false as false, request: requestWithEditedPath };

          if (onRequestResult.handled) {
            if (serviceConfig.awaitResponse !== false) {
              const modifiedResponse = serviceConfig.onResponse
                ? await serviceConfig.onResponse(
                    onRequestResult.response,
                    originalRequest
                  )
                : onRequestResult.response;

              const fetchedResponse = {
                type: "http" as "http",
                id: requestId,
                method: originalRequest.method,
                path: originalRequest.path,
                service,
                time: Date.now() - timeNow,
                response: modifiedResponse,
              };
              success({
                skip: false,
                response: fetchedResponse,
              });
            } else {
              success({ skip: true });
            }
          } else {
            const options = makeGotOptions(
              onRequestResult.request,
              serviceConfig.timeout
            );

            if (serviceConfig.awaitResponse !== false) {
              got(onRequestResult.request.path, options)
                .then(async (serverResponse) => {
                  const response = makeHttpResponse(serverResponse);

                  if (responseIsError(response)) {
                    if (serviceConfig.onError) {
                      serviceConfig.onError(response, onRequestResult.request);
                    }
                  }

                  // Use the original request here - not modifiedRequest
                  const modifiedResponse = serviceConfig.onResponse
                    ? await serviceConfig.onResponse(response, originalRequest)
                    : response;

                  const fetchedResponse = {
                    type: "http" as "http",
                    id: requestId,
                    method: originalRequest.method,
                    path: originalRequest.path,
                    service,
                    time: Date.now() - timeNow,
                    response,
                  };

                  success({ skip: false, response: fetchedResponse });
                })
                .catch(async (error) => {
                  const errorResponse = error.response
                    ? makeHttpResponse(error.response)
                    : {
                        status: 400,
                        content: error.message,
                      };

                  if (responseIsError(errorResponse)) {
                    if (serviceConfig.onError) {
                      serviceConfig.onError(
                        errorResponse,
                        onRequestResult.request
                      );
                    }
                  }

                  // Use the original request here - not modifiedRequest
                  const modifiedResponse = serviceConfig.onResponse
                    ? await serviceConfig.onResponse(
                        errorResponse,
                        originalRequest
                      )
                    : errorResponse;

                  const fetchedResponse = {
                    type: "http" as "http",
                    id: requestId,
                    method: originalRequest.method,
                    path: originalRequest.path,
                    service,
                    time: Date.now() - timeNow,
                    response: errorResponse,
                  };

                  success({ skip: false, response: fetchedResponse });
                });
            } else {
              got(onRequestResult.request.path, options).catch(
                async (error) => {
                  const errorResponse = error.response
                    ? makeHttpResponse(error.response)
                    : {
                        status: 400,
                        content: error.message,
                      };

                  if (responseIsError(errorResponse)) {
                    if (serviceConfig.onError) {
                      serviceConfig.onError(
                        errorResponse,
                        onRequestResult.request
                      );
                    }
                  }
                }
              );
            }
          }
        })
    );
}

function isHttpServiceConfig(
  x: [string, HttpRequestHandlerConfig]
): x is [string, HttpServiceHttpRequestHandlerConfig] {
  return x[1].type === "http";
}
