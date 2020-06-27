import * as configModule from "../../../../config";
import { get as activeRequests } from "./activeRequests";
import responseIsError from "../../../../lib/http/responseIsError";
import {
  RedisServiceHttpResponse,
  HttpRouteConfig,
  FetchedHttpRequestHandlerResponse,
} from "../../../../types/http";
import { HttpProxyConfig } from "../../../../types";

export default function processMessage(httpConfig: HttpProxyConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const config = configModule.get();
    const messageObj = JSON.parse(messageString);
    const activeRequestId = `${messageObj.id}+${messageObj.service}`;
    const activeRequest = activeRequests().get(activeRequestId);

    if (activeRequest) {
      // We're going to process it. So remove it.
      activeRequests().delete(activeRequestId);

      const routeConfig = httpConfig.routes[activeRequest.route][
        activeRequest.method
      ] as HttpRouteConfig;

      const serviceConfig = routeConfig.services[activeRequest.service];
      if (serviceConfig.type === "redis") {
        const channelInRequest = `${httpConfig.redis?.responseChannel}.${config.instanceId}`;

        // Make sure the service responded in the configured channel
        // Otherwise ignore the message.
        if (channel === channelInRequest) {
          const redisResponse =
            (serviceConfig.onResponse &&
              (await serviceConfig.onResponse(
                messageString,
                activeRequest.request,
                activeRequest.responses
              ))) ||
            (messageObj as RedisServiceHttpResponse);

          if (responseIsError(redisResponse.response)) {
            if (serviceConfig.onError) {
              serviceConfig.onError(messageString, activeRequest.request);
            }
          }

          const processingTime = Date.now() - activeRequest.startTime;

          const fetchedResponse: FetchedHttpRequestHandlerResponse = {
            type: "redis",
            id: redisResponse.id,
            time: processingTime,
            path: activeRequest.request.path,
            route: activeRequest.route,
            method: activeRequest.method,
            service: activeRequest.service,
            response: redisResponse.response,
            stage: activeRequest.stage,
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
