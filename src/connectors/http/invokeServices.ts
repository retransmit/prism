import {
  RouteConfig,
  FetchedResponse,
  HttpRequest,
  HttpResponse,
  HttpServiceHandlerConfig,
} from "../../types";

import * as configModule from "../../config";
import got from "got";
import responseIsError from "../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest
): Promise<FetchedResponse>[] {
  const timeNow = Date.now();
  const config = configModule.get();
  const path = request.path;
  const method = request.method;
  const routeConfig = config.routes[path][method] as RouteConfig;

  const promises: Promise<FetchedResponse>[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "http") {
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

      const modifiedRequest = serviceConfig.config.modifyServiceRequest
        ? serviceConfig.config.modifyServiceRequest(requestCopy)
        : requestCopy;

      const basicOptions = {
        searchParams: modifiedRequest.query,
        method: method,
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

      if (serviceConfig.awaitResponse !== false) {
        promises.push(
          new Promise<FetchedResponse>((success) => {
            got(modifiedRequest.path, options)
              .then(async (serverResponse) => {
                const httpResponse = makeHttpResponse(serverResponse);

                if (responseIsError(httpResponse)) {
                  if (serviceConfig.logError) {
                    serviceConfig.logError(httpResponse, modifiedRequest);
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
                success(fetchedResponse);
              })
              .catch(async (error) => {
                const httpResponse = makeHttpResponse(error.response);

                if (responseIsError(httpResponse)) {
                  if (serviceConfig.logError) {
                    serviceConfig.logError(httpResponse, modifiedRequest);
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
                success(fetchedResponse);
              });
          })
        );
      } else {
        got(modifiedRequest.path, options).catch(async (error) => {
          const httpResponse = makeHttpResponse(error.response);

          if (responseIsError(httpResponse)) {
            if (serviceConfig.logError) {
              serviceConfig.logError(httpResponse, modifiedRequest);
            }
          }
        });
      }
    }
  }

  return promises;
}

async function makeFetchedResponse(
  requestId: string,
  startTime: number,
  service: string,
  request: HttpRequest,
  httpResponse: HttpResponse | undefined,
  serviceConfig: HttpServiceHandlerConfig
): Promise<FetchedResponse> {
  const modifiedResponse = serviceConfig.modifyServiceResponse
    ? await serviceConfig.modifyServiceResponse(httpResponse)
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
