import { WebSocketProxyConfig, HttpRequest, WebSocketServiceAppConfig } from "../../../../types";
import {
  HttpServiceWebSocketRequestHandlerConfig,
  WebSocketDisconnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../utils/http/responseIsError";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";

export default async function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketRequestHandlerConfig,
  config: WebSocketServiceAppConfig
) {
  if (serviceConfig.onDisconnectUrl) {
    const webSocketRequest: WebSocketDisconnectRequest = {
      id: requestId,
      type: "disconnect",
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

    if (!onRequestResult.handled) {
      const options = makeGotOptions(
        onRequestResult.request,
        serviceConfig.onDisconnectRequestEncoding
      );

      // We don't care about the response here.
      // The client has already disco'ed.
      got(
        await selectRandomUrl(
          serviceConfig.onDisconnectUrl,
          serviceConfig.getOnDisconnectUrl
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
