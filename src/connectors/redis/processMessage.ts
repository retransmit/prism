import * as configModule from "../../config";
import { ServiceResult, RouteConfig } from "../../types";
import * as activeRequests from "./activeRequests";

export default async function processMessage(
  channel: string,
  messageString: string
) {
  const config = configModule.get();

  const originalServiceResult = JSON.parse(messageString) as ServiceResult;

  const activeRequest = activeRequests.get(
    `${originalServiceResult.id}+${originalServiceResult.service}`
  );

  if (activeRequest) {
    const routeConfig = config.routes[activeRequest.path][
      activeRequest.method
    ] as RouteConfig;

    const serviceConfig = routeConfig.services[activeRequest.service];
    if (serviceConfig.type === "redis") {
      const channelInRequest = serviceConfig.config.responseChannel;

      // Make sure the service responded in the configured channel
      // Otherwise ignore the message.
      if (channel === channelInRequest) {
        const modifyServiceResponse =
          routeConfig.services[activeRequest.service].modifyServiceResponse;

        const serviceResult = modifyServiceResponse
          ? {
              ...originalServiceResult,
              response: await modifyServiceResponse(
                originalServiceResult.response
              ),
            }
          : originalServiceResult;

        const processingTime = Date.now() - activeRequest.startTime;

        const fetchedResult = {
          time: processingTime,
          ignore: false as false,
          path: activeRequest.path,
          method: activeRequest.method,
          service: activeRequest.service,
          serviceResult: serviceResult,
        };

        activeRequest.onSuccess(fetchedResult);
      }
    }
  }
}
