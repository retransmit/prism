import * as configModule from "../../config";
import { ServiceResult, RouteConfig } from "../../types";
import * as activeRequests from "./activeRequests";

export default async function processMessage(
  channel: string,
  messageString: string
) {
  const config = configModule.get();

  const serviceResult = JSON.parse(messageString) as ServiceResult;

  const activeRequest = activeRequests.get(
    `${serviceResult.id}+${serviceResult.service}`
  );

  if (activeRequest) {
    const routeConfig = config.routes[activeRequest.path][
      activeRequest.method
    ] as RouteConfig;

    const serviceConfig = routeConfig.services[activeRequest.service];
    if (serviceConfig.type === "redis") {
      const channelInRequest =
        serviceConfig.config.responseChannel;

      // Make sure the service responded in the configured channel
      // Otherwise ignore the message.
      if (channel === channelInRequest) {
        const config = configModule.get();
        const resultHandler =
          routeConfig.services[activeRequest.service].handlers?.result;

        const processingTime = Date.now() - activeRequest.startTime;

        if (serviceResult.success) {
          const fetchedResult = {
            time: processingTime,
            ignore: false,
            path: activeRequest.path,
            method: activeRequest.method,
            service: activeRequest.service,
            serviceResult: serviceResult,
          };
          activeRequest.onSuccess(
            resultHandler ? await resultHandler(fetchedResult) : fetchedResult
          );
        } else {
          const routeConfig = config.routes[activeRequest.path][
            activeRequest.method
          ] as RouteConfig;
          if (
            routeConfig.services[activeRequest.service].abortOnError === false
          ) {
            const fetchedResult = {
              time: processingTime,
              ignore: true as true,
              path: activeRequest.path,
              method: activeRequest.method,
              service: activeRequest.service,
            };
            activeRequest.onSuccess(
              resultHandler ? await resultHandler(fetchedResult) : fetchedResult
            );
          } else {
            const fetchedResult = {
              time: processingTime,
              ignore: false,
              path: activeRequest.path,
              method: activeRequest.method,
              service: activeRequest.service,
              serviceResult: serviceResult,
            };
            activeRequest.onError(
              resultHandler ? await resultHandler(fetchedResult) : fetchedResult
            );
          }
        }
      }
    }
  }
}
