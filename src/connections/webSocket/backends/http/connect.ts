import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketConnectRequest,
} from "../../../../types/webSocketRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";
import respond from "../../respond";

export default async function connect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  if (serviceConfig.onConnectUrl) {
    const websocketRequest: WebSocketConnectRequest = {
      id: requestId,
      type: "connect",
      route: conn.route,
    };

    const httpRequest = {
      path: serviceConfig.onConnectUrl,
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

    if (onRequestResult.handled) {
      if (onRequestResult.response) {
        respond(requestId, onRequestResult.response, conn, websocketConfig);
      }
    } else {
      const options = makeGotOptions(onRequestResult.request);

      got(serviceConfig.url, options).catch(async (error) => {
        // TODO...
      });
    }
  }
}
