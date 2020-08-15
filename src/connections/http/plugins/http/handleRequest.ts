import { AppConfig } from "../../../../types/config";

import {
  InvokeHttpServiceResult,
  HttpServiceEndPointConfig,
  NativeHttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../../../types/config/httpProxy";
import mapBodyAndHeaders from "../../mapBodyAndHeaders";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";
import makeGotRequest from "./makeGotRequest";
import fireAndForgetGotRequest from "./fireAndForgetGotRequest";
import { replaceParamsInUrl } from "./replaceParamsInUrl";
import {
  HttpRequest,
  HttpMethods,
  FetchedHttpResponse,
  HttpResponse,
} from "../../../../types/http";

/*
  Make Promises for Http Services
*/
export default function handleRequest(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  stage: number | undefined,
  fetchedResponses: FetchedHttpResponse[],
  servicesInStage: {
    [name: string]: HttpServiceEndPointConfig;
  },
  routeConfig: HttpRouteConfig,
  config: AppConfig
): Promise<InvokeHttpServiceResult>[] {
  return Object.keys(servicesInStage)
    .map(
      (service) =>
        [service, servicesInStage[service]] as [
          string,
          HttpServiceEndPointConfig
        ]
    )
    .filter(isNativeHttpServiceConfig)
    .map(
      ([service, serviceConfig]) =>
        new Promise(async (success) => {
          const startTime = Date.now();
          const params = request.params || {};

          const serviceUrl = await selectRandomUrl(
            serviceConfig.url,
            serviceConfig.getUrl
          );

          const urlWithParamsReplaced = replaceParamsInUrl(params, serviceUrl);

          const requestWithMappedFields = mapBodyAndHeaders(
            request,
            serviceConfig
          );

          const requestWithEditedPath: HttpRequest = {
            ...requestWithMappedFields,
            path: urlWithParamsReplaced,
          };

          const onRequestResult = (serviceConfig.onRequest &&
            (await serviceConfig.onRequest(
              requestWithEditedPath,
              fetchedResponses
            ))) || { handled: false as false, request: requestWithEditedPath };

          if (onRequestResult.handled) {
            if (serviceConfig.awaitResponse !== false) {
              const fetchedResponse = {
                type: "http" as "http",
                id: requestId,
                route,
                method,
                path: request.path,
                service,
                time: Date.now() - startTime,
                response: onRequestResult.response,
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
              if (!routeConfig.useStream) {
                makeGotRequest(
                  requestId,
                  onRequestResult.request,
                  route,
                  method,
                  service,
                  stage,
                  startTime,
                  fetchedResponses,
                  serviceConfig,
                  success
                );
              } else {
              }
            } else {
              if (!routeConfig.useStream) {
                fireAndForgetGotRequest(onRequestResult.request, serviceConfig);
              } else {
              }
            }
          }
        })
    );
}

function isNativeHttpServiceConfig(
  x: [string, HttpServiceEndPointConfig]
): x is [string, NativeHttpServiceEndPointConfig] {
  return x[1].type === "http";
}
