import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketDisconnectRequest,
} from "../../../../types/webSocketRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";

export default function disconnect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  handlerConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const websocketRequest: WebSocketDisconnectRequest = {
    id: requestId,
    type: "disconnect",
    route: conn.route,
  };

  const request: HttpRequest = {
    path: handlerConfig.onDisconnectUrl,
    method: "POST",
    body: websocketRequest,
    remoteAddress: conn.ip,
    remotePort: conn.port,
  };

  const options = makeGotOptions(request);

  // We don't care about the response here.
  // The client has already disco'ed.
  got(handlerConfig.url, options).catch(async (error) => {
    // TODO...
  });
}
