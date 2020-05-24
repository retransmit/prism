import * as configModule from "../../../../config";
import activeRequests from "./activeRequests";
import { ActiveRedisHttpRequest, RouteConfig, FetchedHttpResponse } from "../../../../types/HttpRequests";

let isCleaningUp = false;

/*
  Scavenging for timed out messages
*/
export default async function cleanupTimedOut() {
  if (!isCleaningUp) {
    isCleaningUp = true;
    const config = configModule.get();
    const entries = activeRequests.entries();

    const timedOut: [string, ActiveRedisHttpRequest][] = [];
    for (const [id, activeRequest] of entries) {
      if (Date.now() > activeRequest.timeoutAt) {
        activeRequests.delete(id);
        timedOut.push([activeRequest.id, activeRequest]);
      }
    }

    for (const [activeRequestId, activeRequest] of timedOut) {
      const routeConfig = config.http.routes[activeRequest.request.path][
        activeRequest.request.method
      ] as RouteConfig;

      const fetchedResponse: FetchedHttpResponse = {
        type: "redis",
        id: activeRequestId,
        time: Date.now() - activeRequest.startTime,
        service: activeRequest.service,
        path: activeRequest.request.path,
        method: activeRequest.request.method,
        response: {
          content: `${activeRequest.service} timed out.`,
          status: 408,
        },
      };

      activeRequest.onResponse({
        skip: false,
        response: fetchedResponse,
      });
    }
    isCleaningUp = false;
  }
}
