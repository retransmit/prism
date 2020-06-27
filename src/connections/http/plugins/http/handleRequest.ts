import {
  HttpRequest,
  HttpServiceHttpRequestHandlerConfig,
  HttpRequestHandlerConfig,
  HttpProxyConfig,
  HttpMethods,
} from "../../../../types";

import got from "got";
import responseIsError from "../../../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import {
  InvokeServiceResult,
  FetchedHttpRequestHandlerResponse,
} from "../../../../types/http";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";
import selectRandomUrl from "../../../../lib/http/selectRandomUrl";

/*
  Make Promises for Http Services
*/
export default function handleRequest(
  requestId: string,
  originalRequest: HttpRequest,
  route: string,
  method: HttpMethods,
  stage: number | undefined,
  otherResponses: FetchedHttpRequestHandlerResponse[],
  services: {
    [name: string]: HttpRequestHandlerConfig;
  },
  httpConfig: HttpProxyConfig
): Promise<InvokeServiceResult>[] {
  return Object.keys(services)
    .map(
      (service) =>
        [service, services[service]] as [string, HttpRequestHandlerConfig]
    )
    .filter(isHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const timeNow = Date.now();
          const params = originalRequest.params || {};

          const serviceUrl = await selectRandomUrl(
            serviceConfig.url,
            serviceConfig.getUrl
          );

          const urlWithParamsReplaced = params
            ? Object.keys(params).reduce((acc, param) => {
                return acc.replace(`/:${param}`, `/${params[param]}`);
              }, serviceUrl)
            : serviceUrl;

          const requestWithMappedFields = mapBodyAndHeaders(
            originalRequest,
            serviceConfig
          );

          const requestWithEditedPath = {
            ...requestWithMappedFields,
            path: urlWithParamsReplaced,
          };

          const onRequestResult = (serviceConfig.onRequest &&
            (await serviceConfig.onRequest(
              requestWithEditedPath,
              otherResponses
            ))) || { handled: false as false, request: requestWithEditedPath };

          if (onRequestResult.handled) {
            if (serviceConfig.awaitResponse !== false) {
              const modifiedResponse =
                (serviceConfig.onResponse &&
                  (await serviceConfig.onResponse(
                    onRequestResult.response,
                    originalRequest,
                    otherResponses
                  ))) ||
                onRequestResult.response;

              const fetchedResponse = {
                type: "http" as "http",
                id: requestId,
                route,
                method,
                path: originalRequest.path,
                service,
                time: Date.now() - timeNow,
                response: modifiedResponse,
                stage,
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
              serviceConfig.encoding,
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
                  const modifiedResponse =
                    (serviceConfig.onResponse &&
                      (await serviceConfig.onResponse(
                        response,
                        originalRequest,
                        otherResponses
                      ))) ||
                    response;

                  const fetchedResponse = {
                    type: "http" as "http",
                    id: requestId,
                    route,
                    method,
                    path: originalRequest.path,
                    service,
                    time: Date.now() - timeNow,
                    response: modifiedResponse,
                    stage,
                  };

                  success({ skip: false, response: fetchedResponse });
                })
                .catch(async (error) => {
                  const errorResponse = error.response
                    ? makeHttpResponse(error.response)
                    : {
                        status: 400,
                        body: error.message,
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
                  const modifiedResponse =
                    (serviceConfig.onResponse &&
                      (await serviceConfig.onResponse(
                        errorResponse,
                        originalRequest,
                        otherResponses
                      ))) ||
                    errorResponse;

                  const fetchedResponse = {
                    type: "http" as "http",
                    id: requestId,
                    route,
                    method,
                    path: originalRequest.path,
                    service,
                    time: Date.now() - timeNow,
                    response: modifiedResponse,
                    stage,
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
                        body: error.message,
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
