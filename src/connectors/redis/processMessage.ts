import * as configModule from "../../config";
import { RouteConfig, HttpResponse, RedisServiceResponse, FetchedResponse } from "../../types";
import * as activeRequests from "./activeRequests";

export default async function processMessage(
  channel: string,
  messageString: string
) {
  const config = configModule.get();

  const redisResponse = JSON.parse(messageString) as RedisServiceResponse;

  const activeRequest = activeRequests.get(
    `${redisResponse.id}+${redisResponse.service}`
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
        const modifyServiceResponse = serviceConfig.modifyServiceResponse;

        const response = modifyServiceResponse
          ? await modifyServiceResponse(redisResponse.response)
          : redisResponse.response;

        const processingTime = Date.now() - activeRequest.startTime;

        const fetchedResponse: FetchedResponse = {
          id: redisResponse.id,
          time: processingTime,
          path: activeRequest.path,
          method: activeRequest.method,
          service: activeRequest.service,
          response
        };

        activeRequest.onResponse(fetchedResponse);
      }
    }
  }
}
