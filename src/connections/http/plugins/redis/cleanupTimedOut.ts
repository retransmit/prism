import { get as activeRequests, ActiveHttpRequest } from "./activeRequests";
import {
  HttpRouteConfig,
  FetchedHttpRequestHandlerResponse,
} from "../../../../types/httpConnection";
import { HttpProxyConfig } from "../../../../types";

let isCleaningUp = false;

/*
  Scavenging for timed out messages
*/
export default function cleanupTimedOut(httpConfig: HttpProxyConfig) {
  return async function cleanupTimedOutImpl() {
    if (!isCleaningUp) {
      isCleaningUp = true;
      const entries = activeRequests().entries();

      const timedOut: [string, ActiveHttpRequest][] = [];
      for (const [id, activeRequest] of entries) {
        if (Date.now() > activeRequest.timeoutAt) {
          activeRequests().delete(id);
          timedOut.push([activeRequest.id, activeRequest]);
        }
      }

      for (const [activeRequestId, activeRequest] of timedOut) {
        const routeConfig = httpConfig.routes[activeRequest.request.path][
          activeRequest.request.method
        ] as HttpRouteConfig;

        const fetchedResponse: FetchedHttpRequestHandlerResponse = {
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
  };
}
