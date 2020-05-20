import * as configModule from "../../config";
import {
  RouteConfig,
  HttpResponse,
  RedisServiceResponse,
  FetchedResponse,
  HttpRequest,
} from "../../types";
import * as activeRequests from "./activeRequests";
import { isHttpError } from "../../httpUtil";

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
    const routeConfig = config.routes[activeRequest.request.path][
      activeRequest.request.method
    ] as RouteConfig;

    const serviceConfig = routeConfig.services[activeRequest.service];
    if (serviceConfig.type === "redis") {
      const channelInRequest = serviceConfig.config.responseChannel;

      // Make sure the service responded in the configured channel
      // Otherwise ignore the message.
      if (channel === channelInRequest) {
        if (isHttpError(redisResponse.response)) {
          if (serviceConfig.logError) {
            serviceConfig.logError(
              redisResponse.response,
              activeRequest.request
            );
          }
        }

        const modifyServiceResponse = serviceConfig.modifyServiceResponse;

        const response = modifyServiceResponse
          ? await modifyServiceResponse(redisResponse.response)
          : redisResponse.response;

        const processingTime = Date.now() - activeRequest.startTime;

        const fetchedResponse: FetchedResponse = {
          type: "redis",
          id: redisResponse.id,
          time: processingTime,
          path: activeRequest.request.path,
          method: activeRequest.request.method,
          service: activeRequest.service,
          response,
        };

        activeRequest.onResponse(fetchedResponse);
      }
    }
  }
}
