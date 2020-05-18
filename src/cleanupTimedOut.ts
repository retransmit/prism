import * as configModule from "./config";
import { RequestData, RouteConfig } from "./types";
import * as activeRequests from "./activeRequests";

let isCleaningUp = false;

/*
  Scavenging for timed out messages
*/
export default async function cleanupTimedOut() {
  if (!isCleaningUp) {
    isCleaningUp = true;
    const config = configModule.get();
    const entries = activeRequests.entries();

    const timedOut: [string, RequestData][] = [];
    for (const [id, requestData] of entries) {
      if (Date.now() > requestData.timeoutTicks) {
        timedOut.push([requestData.id, requestData]);
      }
    }

    for (const [activeRequestId, requestData] of timedOut) {
      const routeConfig = config.routes[requestData.path][
        requestData.method
      ] as RouteConfig;
      const resultHandler =
        (config.handlers && config.handlers.result) ||
        (routeConfig.handlers && routeConfig.handlers.result);

      if (routeConfig.services[requestData.service].abortOnError === false) {
        const fetchedResult = {
          time: Date.now() - requestData.startTime,
          ignore: true as true,
          path: requestData.path,
          method: requestData.method,
          service: requestData.service,
        };
        requestData.onSuccess(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      } else {
        const fetchedResult = {
          time: Date.now() - requestData.startTime,
          ignore: false,
          service: requestData.service,
          path: requestData.path,
          method: requestData.method,
          serviceResult: {
            id: requestData.id,
            success: false,
            service: requestData.service,
            response: {
              content: `${requestData.service} timed out.`,
              status: 408,
            },
          },
        };
        requestData.onError(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      }
      activeRequests.remove(activeRequestId);
    }
    isCleaningUp = false;
  }
}
