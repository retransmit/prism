import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketDisconnectRequest,
} from "../../../../types/webSocketRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";
import { makeHttpResponse } from "../../../http/plugins/http/makeHttpResponse";
import responseIsError from "../../../../lib/http/responseIsError";

export default async function disconnect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  if (serviceConfig.onDisconnectUrl) {
    const websocketRequest: WebSocketDisconnectRequest = {
      id: requestId,
      type: "disconnect",
      route: conn.route,
    };

    const httpRequest = {
      path: serviceConfig.onDisconnectUrl,
      method: "POST" as "POST",
      body: websocketRequest,
      remoteAddress: conn.ip,
      remotePort: conn.port,
    };

    const onRequestResult = serviceConfig.onRequest
      ? await serviceConfig.onRequest(httpRequest)
      : {
          handled: false as false,
          request: httpRequest,
        };

    if (!onRequestResult.handled) {
      const options = makeGotOptions(onRequestResult.request);

      // We don't care about the response here.
      // The client has already disco'ed.
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
