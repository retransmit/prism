import * as configModule from "../../config";
import { ActiveRedisRequest, RouteConfig, FetchedResponse } from "../../types";
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

      const fetchedResponse: FetchedResponse = {
        id: activeRequestId,
        time: Date.now() - trackedRequest.startTime,
        service: trackedRequest.service,
        path: trackedRequest.path,
        method: trackedRequest.method,
        response: {
          content: `${trackedRequest.service} timed out.`,
          status: 408,
        },
      };

      trackedRequest.onResponse(fetchedResponse);
      activeRequests.remove(activeRequestId);
    }
    isCleaningUp = false;
  }
}
