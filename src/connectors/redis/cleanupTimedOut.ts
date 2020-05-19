import * as configModule from "../../config";
import { ActiveRedisRequest, RouteConfig } from "../../types";
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

    const timedOut: [string, ActiveRedisRequest][] = [];
    for (const [id, trackedRequest] of entries) {
      if (Date.now() > trackedRequest.timeoutTicks) {
        timedOut.push([trackedRequest.id, trackedRequest]);
      }
    }

    for (const [activeRequestId, trackedRequest] of timedOut) {
      const routeConfig = config.routes[trackedRequest.path][
        trackedRequest.method
      ] as RouteConfig;
      const resultHandler =
        routeConfig.services[trackedRequest.service].handlers?.result;

      if (routeConfig.services[trackedRequest.service].abortOnError === false) {
        const fetchedResult = {
          time: Date.now() - trackedRequest.startTime,
          ignore: true as true,
          path: trackedRequest.path,
          method: trackedRequest.method,
          service: trackedRequest.service,
        };
        trackedRequest.onSuccess(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      } else {
        const fetchedResult = {
          time: Date.now() - trackedRequest.startTime,
          ignore: false,
          service: trackedRequest.service,
          path: trackedRequest.path,
          method: trackedRequest.method,
          serviceResult: {
            id: trackedRequest.id,
            success: false,
            service: trackedRequest.service,
            response: {
              content: `${trackedRequest.service} timed out.`,
              status: 408,
            },
          },
        };
        trackedRequest.onError(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      }
      activeRequests.remove(activeRequestId);
    }
    isCleaningUp = false;
  }
}
