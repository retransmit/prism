import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketConnectRequest,
} from "../../../../types/webSocketClients";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../lib/http/responseIsError";

export default async function connect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  if (serviceConfig.onConnectUrl) {
    const webSocketRequest: WebSocketConnectRequest = {
      id: requestId,
      type: "connect",
      route: conn.route,
    };

    const httpRequest = {
      path: serviceConfig.onConnectUrl,
      method: "POST" as "POST",
      body: webSocketRequest,
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
        respondToWebSocketClient(requestId, onRequestResult.response, conn, webSocketConfig);
      }
    } else {
      const options = makeGotOptions(onRequestResult.request);

      got(serviceConfig.url, options).catch(async (error) => {
        const errorResponse = error.response
          ? makeHttpResponse(error.response)
          : {
              status: 400,
              content: error.message,
            };

        if (responseIsError(errorResponse)) {
          if (serviceConfig.onError) {
            serviceConfig.onError(errorResponse, onRequestResult.request);
          }
        }
      });
    }
  }
}
