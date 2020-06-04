import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketRouteConfig,
  WebSocketResponse,
} from "../../../../types/webSocketRequests";
import * as activeConnections from "../../activeConnections";
import respond from "../../respond";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import { makeWebSocketResponse } from "./makeWebSocketResponse";

export function setupPolling(websocketConfig: WebSocketProxyConfig) {
  for (const route of Object.keys(websocketConfig.routes)) {
    for (const service of Object.keys(websocketConfig.routes[route].services)) {
      const serviceConfig = websocketConfig.routes[route].services[service];
      if (serviceConfig.type === "http") {
        setInterval(
          timerCallback(route, service, serviceConfig, websocketConfig),
          serviceConfig.pollingInterval || 60000 //every minute
        );
      }
    }
  }
}

function timerCallback(
  route: string,
  service: string,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  return () => {
    (async function () {
      const connections = activeConnections.get().entries();
      for (const [requestId, conn] of connections) {
        if (conn.route === route) {
          const httpRequest: HttpRequest = {
            path: serviceConfig.url,
            method: "POST",
            body: conn.lastRequest || { id: requestId },
            remoteAddress: conn.ip,
            remotePort: conn.port,
          };

          const onRequestResult = serviceConfig.onRequest
            ? await serviceConfig.onRequest(httpRequest)
            : {
                handled: false as false,
                request: httpRequest,
              };

          if (onRequestResult.handled) {
            if (onRequestResult.response) {
              respond(
                requestId,
                onRequestResult.response,
                conn,
                websocketConfig
              );
            }
          } else {
            const options = makeGotOptions(httpRequest);
            got(serviceConfig.url, options)
              .then(async (serverResponse) => {
                const websocketResponse = makeWebSocketResponse(
                  serverResponse,
                  requestId
                );
                respond(requestId, websocketResponse, conn, websocketConfig);
              })
              .catch(async (error) => {
                const websocketResponse: WebSocketResponse = error.response
                  ? makeWebSocketResponse(error.response, requestId)
                  : {
                      id: requestId,
                      response: error.message,
                      route,
                      service,
                      type: "message",
                    };
              });
          }
        }
      }
    })();
  };
}

export function saveLastRequest(routeConfig: WebSocketRouteConfig) {
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http") {
      if (
        typeof serviceConfig.resendRequestWhilePolling !== "undefined"
          ? serviceConfig.resendRequestWhilePolling
          : false
      ) {
        return true;
      }
    }
  }
  return false;
}
