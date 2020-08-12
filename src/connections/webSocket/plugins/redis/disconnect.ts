import { WebSocketProxyAppConfig } from "../../../../types/config";
import {
  RedisWebSocketEndPointConfig,
  WebSocketDisconnectRequest,
} from "../../../../types/config/webSocketProxy";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import { publish } from "./publish";
import { ActiveWebSocketConnection } from "../../../../types/webSocket";

export default async function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: RedisWebSocketEndPointConfig,
  config: WebSocketProxyAppConfig
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
