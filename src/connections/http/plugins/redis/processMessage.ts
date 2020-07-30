import { get as activeRequests } from "./activeRequests";
import responseIsError from "../../../../utils/http/responseIsError";
import {
  RedisHttpResponse,
  HttpRouteConfig,
  FetchedHttpResponse,
} from "../../../../types/httpProxy";
import { HttpProxyAppConfig } from "../../../../types";

export default function processMessage(config: HttpProxyAppConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const messageObj = JSON.parse(messageString);
    const activeRequestId = `${messageObj.id}+${messageObj.service}`;
    const activeRequest = activeRequests().get(activeRequestId);

    if (activeRequest) {
      // We're going to process it. So remove it.
      activeRequests().delete(activeRequestId);

      const routeConfig = config.http.routes[activeRequest.route][
        activeRequest.method
      ] as HttpRouteConfig;

      const serviceConfig = routeConfig.services[activeRequest.service];
      if (serviceConfig.type === "redis") {
        const channelInRequest = `${config.http.redis?.responseChannel}.${config.instanceId}`;

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
            (messageObj as RedisHttpResponse);

          if (responseIsError(redisResponse.response)) {
            if (serviceConfig.onError) {
              serviceConfig.onError(messageString, activeRequest.request);
            }
          }

          const processingTime = Date.now() - activeRequest.startTime;

          const fetchedResponse: FetchedHttpResponse = {
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
