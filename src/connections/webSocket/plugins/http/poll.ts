import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketRequestHandlerConfig,
  WebSocketRouteConfig,
  WebSocketResponse,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import * as activeConnections from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got";
import { makeWebSocketResponse } from "./makeWebSocketResponse";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../lib/http/responseIsError";
import selectRandomUrl from "../../../../lib/http/selectRandomUrl";

export function setupPolling(webSocketConfig: WebSocketProxyConfig) {
  for (const route of Object.keys(webSocketConfig.routes)) {
    for (const service of Object.keys(webSocketConfig.routes[route].services)) {
      const serviceConfig = webSocketConfig.routes[route].services[service];
      if (serviceConfig.type === "http") {
        setInterval(
          timerCallback(route, service, serviceConfig, webSocketConfig),
          serviceConfig.pollingInterval || 60000 //every minute
        );
      }
    }
  }
}

function timerCallback(
  route: string,
  service: string,
  serviceConfig: HttpServiceWebSocketRequestHandlerConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  return () => {
    (async function () {
      const connections = activeConnections.get().entries();
      for (const [requestId, conn] of connections) {
        if (conn.route === route) {
          doPoll(
            route,
            service,
            requestId,
            conn,
            serviceConfig,
            webSocketConfig
          );
        }
      }
    })();
  };
}

async function doPoll(
  route: string,
  service: string,
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketRequestHandlerConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  const httpRequest: HttpRequest = {
    path: conn.path,
    method: "POST",
    body: conn.lastRequest || { id: requestId },
    remoteAddress: conn.remoteAddress,
    remotePort: conn.remotePort,
  };

  const onRequestResult = (serviceConfig.onRequest &&
    (await serviceConfig.onRequest(httpRequest))) || {
    handled: false as false,
    request: httpRequest,
  };

  if (onRequestResult.handled) {
    if (onRequestResult.response) {
      respondToWebSocketClient(
        requestId,
        onRequestResult.response,
        conn,
        webSocketConfig
      );
    }
  } else {
    const options = makeGotOptions(httpRequest, serviceConfig.encoding);

    got(await selectRandomUrl(serviceConfig.url, serviceConfig.getUrl), options)
      .then(async (serverResponse) => {
        const webSocketResponse =
          (serviceConfig.onResponse &&
            (await serviceConfig.onResponse(
              requestId,
              makeHttpResponse(serverResponse)
            ))) ||
          makeWebSocketResponse(serverResponse, requestId);

        respondToWebSocketClient(
          requestId,
          webSocketResponse,
          conn,
          webSocketConfig
        );
      })
      .catch(async (error) => {
        const webSocketResponse: WebSocketResponse = error.response
          ? makeWebSocketResponse(error.response, requestId)
          : {
              id: requestId,
              response: error.message,
              route,
              service,
              type: "message",
            };

        respondToWebSocketClient(
          requestId,
          webSocketResponse,
          conn,
          webSocketConfig
        );

        const errorResponse = error.response
          ? makeHttpResponse(error.response)
          : {
              status: 400,
              body: error.message,
            };

        if (responseIsError(errorResponse)) {
          if (serviceConfig.onError) {
            serviceConfig.onError(errorResponse, onRequestResult.request);
          }
        }
      });
  }
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
