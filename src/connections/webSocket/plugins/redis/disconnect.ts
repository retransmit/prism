import { WebSocketProxyConfig, WebSocketServiceAppConfig } from "../../../../types";
import {
  RedisServiceWebSocketRequestHandlerConfig,
  WebSocketDisconnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import { publish } from "./publish";

export default async function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: RedisServiceWebSocketRequestHandlerConfig,
  config: WebSocketServiceAppConfig
) {
  const channel = getChannelForService(
    serviceConfig.requestChannel,
    serviceConfig.numRequestChannels
  );

  const request: WebSocketDisconnectRequest = {
    id: requestId,
    route: conn.route,
    path: conn.path,
    type: "disconnect",
    remoteAddress: conn.remoteAddress,
    remotePort: conn.remotePort,
  };

  const onRequestResult = (serviceConfig.onRequest &&
    (await serviceConfig.onRequest(request))) || {
    handled: false as false,
    request: JSON.stringify(request),
  };

  if (!onRequestResult.handled) {
    publish(channel, onRequestResult.request);
  }
}
