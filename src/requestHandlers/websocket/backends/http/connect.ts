import { WebSocketProxyConfig, HttpRequest } from "../../../../types";
import {
  HttpServiceWebSocketHandlerConfig,
  WebSocketConnectRequest,
} from "../../../../types/webSocketRequests";
import { makeGotOptions } from "../../../../lib/http/gotUtil";
import got from "got/dist/source";
import * as activeConnections from "../../activeConnections";

export default function connect(
  requestId: string,
  conn: activeConnections.ActiveWebSocketConnection,
  handlerConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const websocketRequest: WebSocketConnectRequest = {
    id: requestId,
    type: "connect",
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

  got(handlerConfig.url, options).catch(async (error) => {
    // TODO...
  });
}
