import * as configModule from "../config";
import { ServiceResult, RouteConfig } from "../types";
import * as activeRequests from "../activeRequests";
import { processResult } from "../processResult";

export default async function processMessage(
  channel: string,
  messageString: string
) {
  const config = configModule.get();

  const serviceResult = JSON.parse(messageString) as ServiceResult;

  const activeRequest = activeRequests.get(
    `${serviceResult.id}+${serviceResult.service}`
  );

  if (activeRequest && activeRequest.type === "redis") {
    const routeConfig = config.routes[activeRequest.path][
      activeRequest.method
    ] as RouteConfig;

    const channelInRequest =
      routeConfig.services[activeRequest.service].redis?.responseChannel;

    // Make sure the service responded in the configured channel
    // Otherwise ignore the message.
    if (channel === channelInRequest) {
      processResult(activeRequest, routeConfig, serviceResult);
    }
  }
}
