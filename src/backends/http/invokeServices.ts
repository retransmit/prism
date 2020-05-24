import {
  RouteConfig,
  FetchedResponse,
  HttpRequest,
  HttpResponse,
  HttpServiceConfig,
  ServiceConfig,
} from "../../types";

import * as configModule from "../../config";
import got from "got";
import responseIsError from "../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import { InvokeServiceResult } from "../../handler";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest
): Promise<InvokeServiceResult>[] {
  const timeNow = Date.now();
  const config = configModule.get();
  const path = request.path;
  const method = request.method;
  const routeConfig = config.http.routes[path][method] as RouteConfig;

  const promises: Promise<InvokeServiceResult>[] = [];

  return Object.keys(routeConfig.services)
    .map(
      (service) =>
        [service, routeConfig.services[service]] as [string, ServiceConfig]
    )
    .filter(isHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const urlWithParamsReplaced = Object.keys(request.params).reduce(
            (acc, param) => {
              return acc.replace(`/:${param}`, `/${request.params[param]}`);
            },
            serviceConfig.config.url
          );
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

            const basicOptions = {
              searchParams: requestToSend.query,
              method: method,
              headers: requestToSend.headers,
              timeout: serviceConfig.timeout,
            };

            const options =
              typeof requestToSend.body === "string"
                ? {
                    ...basicOptions,
                    body: requestToSend.body,
                  }
                : typeof requestToSend.body === "object"
                ? {
                    ...basicOptions,
                    json: requestToSend.body,
                  }
                : basicOptions;

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
                  const httpResponse = makeHttpResponse(error.response);

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
                const httpResponse = makeHttpResponse(error.response);

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
  x: [string, ServiceConfig]
): x is [string, HttpServiceConfig] {
  return x[1].type === "http";
}

async function makeFetchedResponse(
  requestId: string,
  startTime: number,
  service: string,
  request: HttpRequest,
  httpResponse: HttpResponse | undefined,
  serviceConfig: HttpServiceConfig
): Promise<FetchedResponse> {
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
