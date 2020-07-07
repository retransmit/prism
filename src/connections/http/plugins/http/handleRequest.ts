import { HttpRequest, HttpMethods, AppConfig } from "../../../../types";

import {
  InvokeHttpServiceResult,
  FetchedHttpResponse,
  HttpServiceEndPointConfig,
  NativeHttpServiceEndPointConfig,
} from "../../../../types/http";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";
import makeGotRequest from "./makeGotRequest";
import fireAndForgetGotRequest from "./fireAndForgetGotRequest";

/*
  Make Promises for Http Services
*/
export default function handleRequest(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  stage: number | undefined,
  otherResponses: FetchedHttpResponse[],
  services: {
    [name: string]: HttpServiceEndPointConfig;
  },
  config: AppConfig
): Promise<InvokeHttpServiceResult>[] {
  return Object.keys(services)
    .map(
      (service) =>
        [service, services[service]] as [string, HttpServiceEndPointConfig]
    )
    .filter(isHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const startTime = Date.now();
          const params = request.params || {};

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
            request,
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
                    request,
                    otherResponses
                  ))) ||
                onRequestResult.response;

              const fetchedResponse = {
                type: "http" as "http",
                id: requestId,
                route,
                method,
                path: request.path,
                service,
                time: Date.now() - startTime,
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
            if (serviceConfig.awaitResponse !== false) {
              makeGotRequest(
                requestId,
                onRequestResult.request,
                route,
                method,
                service,
                stage,
                startTime,
                otherResponses,
                serviceConfig,
                success
              );
            } else {
              fireAndForgetGotRequest(onRequestResult.request, serviceConfig);
            }
          }
        })
    );
}

function isHttpServiceConfig(
  x: [string, HttpServiceEndPointConfig]
): x is [string, NativeHttpServiceEndPointConfig] {
  return x[1].type === "http";
}
