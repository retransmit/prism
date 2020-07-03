import { WebSocketServiceAppConfig } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketConnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got";
import respondToWebSocketClient from "../../respond";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../utils/http/responseIsError";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";

export default async function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  config: WebSocketServiceAppConfig
) {
  if (serviceConfig.onConnectUrl) {
    const webSocketRequest: WebSocketConnectRequest = {
      id: requestId,
      type: "connect",
      route: conn.route,
      path: conn.path,
      remoteAddress: conn.remoteAddress,
      remotePort: conn.remotePort,
    };

    const httpRequest = {
      path: conn.path,
      method: "POST" as "POST",
      body: webSocketRequest,
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
        onRequestResult.request,
        serviceConfig.onConnectRequestEncoding
      );

      got(
        await selectRandomUrl(
          serviceConfig.onConnectUrl,
          serviceConfig.getOnConnectUrl
        ),
        options
      ).catch(async (error) => {
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
}
