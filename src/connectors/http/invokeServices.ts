import {
  RouteConfig,
  FetchedResponse,
  HttpRequest,
  HttpResponse,
} from "../../types";

import * as configModule from "../../config";
import got from "got";
import { Response } from "got/dist/source/core";
import { hasErrors } from "../../httpUtil";

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
      function makeHttpResponse(
        serverResponse: Response<string>
      ): HttpResponse {
        return {
          headers: serverResponse.headers,
          content: isJson(serverResponse)
            ? JSON.parse(serverResponse.body)
            : serverResponse.body,
        };
      }

      async function makeFetchedResponse(
        httpResponse: HttpResponse
      ): Promise<FetchedResponse> {
        const finalHttpResponse = serviceConfig.modifyServiceResponse
          ? await serviceConfig.modifyServiceResponse(httpResponse)
          : httpResponse;

        return {
          id: requestId,
          method: request.method,
          path: request.path,
          service,
          time: Date.now() - timeNow,
          response: finalHttpResponse,
        };
      }

      const url = serviceConfig.config.url;

      if (url) {
        const basicOptions = {
          searchParams: request.query,
          method: method,
          headers: request.headers,
          timeout: serviceConfig.timeoutMS,
        };

        const options =
          typeof request.body === "string"
            ? {
                ...basicOptions,
                body: request.body,
              }
            : typeof request.body === "object"
            ? {
                ...basicOptions,
                json: request.body,
              }
            : basicOptions;

        if (serviceConfig.awaitResponse !== false) {
          promises.push(
            new Promise<FetchedResponse>((success) => {
              got(url, options)
                .then(async (serverResponse) => {
                  const httpResponse = makeHttpResponse(serverResponse);

                  if (hasErrors(httpResponse)) {
                    if (serviceConfig.logError) {
                      serviceConfig.logError(httpResponse, request);
                    }
                  }

                  const fetchedResponse = await makeFetchedResponse(
                    httpResponse
                  );
                  success(fetchedResponse);
                })
                .catch(async (error) => {
                  const httpResponse = makeHttpResponse(error.response);

                  if (hasErrors(httpResponse)) {
                    if (serviceConfig.logError) {
                      serviceConfig.logError(httpResponse, request);
                    }
                  }

                  const fetchedResponse = await makeFetchedResponse(
                    httpResponse
                  );
                  success(fetchedResponse);
                });
            })
          );
        } else {
          got(url, options).catch(async (error) => {
            const httpResponse = makeHttpResponse(error.response);

            if (hasErrors(httpResponse)) {
              if (serviceConfig.logError) {
                serviceConfig.logError(httpResponse, request);
              }
            }
          });
        }
      }
    }
  }

  return promises;
}

function isJson(serverResponse: Response<string>) {
  return (
    serverResponse.headers["content-type"]?.indexOf("application/json") !== -1
  );
}
