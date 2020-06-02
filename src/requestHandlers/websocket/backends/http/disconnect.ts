import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketDisconnectRequest,
} from "../../../../types/webSocketRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";

export default async function disconnect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  serviceConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const websocketRequest: WebSocketDisconnectRequest = {
    id: requestId,
    type: "disconnect",
    route: conn.route,
  };

  const onRequestResult = serviceConfig.onRequest
    ? await serviceConfig.onRequest(websocketRequest)
    : {
        handled: false as false,
        request: {
          path: serviceConfig.onDisconnectUrl,
          method: "POST" as "POST",
          body: websocketRequest,
          remoteAddress: conn.ip,
          remotePort: conn.port,
        },
      };

  if (!onRequestResult.handled) {
    const options = makeGotOptions(onRequestResult.request);

    // We don't care about the response here.
    // The client has already disco'ed.
    got(serviceConfig.url, options).catch(async (error) => {
      // TODO...
    });
  }
}
