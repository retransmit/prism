import {
  HttpRequest,
  HttpResponse,
  HttpServiceHttpHandlerConfig,
  HttpHandlerConfig,
  HttpProxyConfig,
} from "../../../../types";

import * as configModule from "../../../../config";
import got from "got";
import responseIsError from "../../../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import {
  HttpRouteConfig,
  FetchedHttpHandlerResponse,
  InvokeServiceResult,
} from "../../../../types/httpRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";

/*
  Make Promises for Http Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest,
  httpConfig: HttpProxyConfig
): Promise<InvokeServiceResult>[] {
  const timeNow = Date.now();
  const config = configModule.get();
  const path = request.path;
  const method = request.method;
  const routeConfig = httpConfig.routes[path][method] as HttpRouteConfig;

  const promises: Promise<InvokeServiceResult>[] = [];

  return Object.keys(routeConfig.services)
    .map(
      (service) =>
        [service, routeConfig.services[service]] as [string, HttpHandlerConfig]
    )
    .filter(isHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const params = request.params || {};
          const urlWithParamsReplaced = params
            ? Object.keys(params).reduce((acc, param) => {
                return acc.replace(`/:${param}`, `/${params[param]}`);
              }, serviceConfig.config.url)
            : serviceConfig.config.url;

          const requestCopy = {
            ...request,
            path: urlWithParamsReplaced,
          };

          const onRequestResult = serviceConfig.config.onRequest
            ? await serviceConfig.config.onRequest(requestCopy)
            : { handled: false as false, request: requestCopy };

          if (onRequestResult.handled) {
            if (serviceConfig.awaitResponse !== false) {
              success({
                skip: false,
                response: await makeFetchedResponse(
                  requestId,
                  timeNow,
                  service,
                  request,
                  onRequestResult.response,
                  serviceConfig
                ),
              });
            } else {
              success({ skip: true });
            }
          } else {
            const requestToSend = onRequestResult.request;

            const options = makeGotOptions(
              requestToSend,
              serviceConfig.timeout
            );

            if (serviceConfig.awaitResponse !== false) {
              got(requestToSend.path, options)
                .then(async (serverResponse) => {
                  const httpResponse = makeHttpResponse(serverResponse);

                  if (responseIsError(httpResponse)) {
                    if (serviceConfig.onError) {
                      serviceConfig.onError(httpResponse, requestToSend);
                    }
                  }

                  // Use the original request here - not modifiedRequest
                  const fetchedResponse = await makeFetchedResponse(
                    requestId,
                    timeNow,
                    service,
                    request,
                    httpResponse,
                    serviceConfig
                  );
                  success({ skip: false, response: fetchedResponse });
                })
                .catch(async (error) => {
                  const httpResponse = error.response
                    ? makeHttpResponse(error.response)
                    : {
                        status: 400,
                        content: error.message,
                      };

                  if (responseIsError(httpResponse)) {
                    if (serviceConfig.onError) {
                      serviceConfig.onError(httpResponse, requestToSend);
                    }
                  }

                  // Use the original request here - not modifiedRequest
                  const fetchedResponse = await makeFetchedResponse(
                    requestId,
                    timeNow,
                    service,
                    request,
                    httpResponse,
                    serviceConfig
                  );
                  success({ skip: false, response: fetchedResponse });
                });
            } else {
              got(requestToSend.path, options).catch(async (error) => {
                const httpResponse = error.response
                  ? makeHttpResponse(error.response)
                  : {
                      status: 400,
                      content: error.message,
                    };

                if (responseIsError(httpResponse)) {
                  if (serviceConfig.onError) {
                    serviceConfig.onError(httpResponse, requestToSend);
                  }
                }
              });
            }
          }
        })
    );
}

function isHttpServiceConfig(
  x: [string, HttpHandlerConfig]
): x is [string, HttpServiceHttpHandlerConfig] {
  return x[1].type === "http";
}

async function makeFetchedResponse(
  requestId: string,
  startTime: number,
  service: string,
  request: HttpRequest,
  httpResponse: HttpResponse,
  serviceConfig: HttpServiceHttpHandlerConfig
): Promise<FetchedHttpHandlerResponse> {
  const modifiedResponse = serviceConfig.onResponse
    ? await serviceConfig.onResponse(httpResponse)
    : httpResponse;

  return {
    type: "http",
    id: requestId,
    method: request.method,
    path: request.path,
    service,
    time: Date.now() - startTime,
    response: modifiedResponse,
  };
}
