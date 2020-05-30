import * as configModule from "../../../../config";
import { get as activeRequests } from "./activeRequests";
import responseIsError from "../../../../lib/http/responseIsError";
import {
  RedisServiceHttpResponse,
  HttpRouteConfig,
  FetchedHttpHandlerResponse,
} from "../../../../types/httpRequests";
import { HttpProxyConfig } from "../../../../types";

export default function processMessage(httpConfig: HttpProxyConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const config = configModule.get();
    const redisResponse = JSON.parse(messageString) as RedisServiceHttpResponse;

    const activeRequestId = `${redisResponse.id}+${redisResponse.service}`;
    const activeRequest = activeRequests().get(activeRequestId);

    if (activeRequest) {
      // We're going to process it. So remove it.
      activeRequests().delete(activeRequestId);

      const routeConfig = httpConfig.routes[activeRequest.request.path][
        activeRequest.request.method
      ] as HttpRouteConfig;

      const serviceConfig = routeConfig.services[activeRequest.service];
      if (serviceConfig.type === "redis") {
        const channelInRequest = `${httpConfig.redis?.responseChannel}.${config.instanceId}`;

        // Make sure the service responded in the configured channel
        // Otherwise ignore the message.
        if (channel === channelInRequest) {
          if (responseIsError(redisResponse.response)) {
            if (serviceConfig.onError) {
              serviceConfig.onError(
                redisResponse.response,
                activeRequest.request
              );
            }
          }

          const response = serviceConfig.onResponse
            ? await serviceConfig.onResponse(redisResponse.response)
            : redisResponse.response;

          const processingTime = Date.now() - activeRequest.startTime;

          const fetchedResponse: FetchedHttpHandlerResponse = {
            type: "redis",
            id: redisResponse.id,
            time: processingTime,
            path: activeRequest.request.path,
            method: activeRequest.request.method,
            service: activeRequest.service,
            response,
          };

          activeRequest.onResponse({
            skip: false,
            response: fetchedResponse,
          });
        }
      }
    }
  };
}
