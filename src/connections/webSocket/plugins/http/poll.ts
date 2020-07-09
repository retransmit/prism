import { HttpRequest, WebSocketProxyAppConfig } from "../../../../types";
import {
  UrlPollingWebSocketEndPointConfig,
  WebSocketRouteConfig,
  WebSocketResponse,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import * as activeConnections from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got";
import { makeWebSocketResponse } from "./makeWebSocketResponse";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../utils/http/responseIsError";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";

export function setupPolling(config: WebSocketProxyAppConfig) {
  for (const route of Object.keys(config.webSocket.routes)) {
    for (const service of Object.keys(
      config.webSocket.routes[route].services
    )) {
      const serviceConfig = config.webSocket.routes[route].services[service];
      if (serviceConfig.type === "http") {
        setInterval(
          timerCallback(route, service, serviceConfig, config),
          serviceConfig.pollingInterval || 60000 //every minute
        );
      }
    }
  }
}

function timerCallback(
  route: string,
  service: string,
  serviceConfig: UrlPollingWebSocketEndPointConfig,
  config: WebSocketProxyAppConfig
) {
  return () => {
    (async function () {
      const connections = activeConnections.get().entries();
      for (const [requestId, conn] of connections) {
        if (conn.route === route) {
          doPoll(route, service, requestId, conn, serviceConfig, config);
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
  serviceConfig: UrlPollingWebSocketEndPointConfig,
  config: WebSocketProxyAppConfig
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
        config
      );
    }
  } else {
    const options = makeGotOptions(
      httpRequest,
      serviceConfig.contentEncoding,
      serviceConfig.contentType
    );

    got(await selectRandomUrl(serviceConfig.url, serviceConfig.getUrl), options)
      .then(async (serverResponse) => {
        const webSocketResponse =
          (serviceConfig.onResponse &&
            (await serviceConfig.onResponse(
              requestId,
              makeHttpResponse(serverResponse)
            ))) ||
          makeWebSocketResponse(serverResponse, requestId);

        respondToWebSocketClient(requestId, webSocketResponse, conn, config);
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

        respondToWebSocketClient(requestId, webSocketResponse, conn, config);

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
