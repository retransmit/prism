import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketRequestHandlerConfig,
  WebSocketDisconnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../lib/http/responseIsError";

export default async function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketRequestHandlerConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  if (serviceConfig.onDisconnectUrl) {
    const webSocketRequest: WebSocketDisconnectRequest = {
      id: requestId,
      type: "disconnect",
      route: conn.route,
    };

    const httpRequest = {
      path: serviceConfig.onDisconnectUrl,
      method: "POST" as "POST",
      body: webSocketRequest,
      remoteAddress: conn.ip,
      remotePort: conn.port,
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
      got(serviceConfig.url, options).catch(async (error) => {
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
