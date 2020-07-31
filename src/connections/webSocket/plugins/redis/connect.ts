import { WebSocketProxyAppConfig } from "../../../../types/config";
import {
  RedisWebSocketEndPointConfig,
  RedisWebSocketConnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/config/webSocketProxy";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import respondToWebSocketClient from "../../respond";
import { publish } from "./publish";

export default async function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: RedisWebSocketEndPointConfig,
  config: WebSocketProxyAppConfig
) {
  const channel = getChannelForService(
    serviceConfig.requestChannel,
    serviceConfig.numRequestChannels
  );

  const request: RedisWebSocketConnectRequest = {
    id: requestId,
    type: "connect",
    route: conn.route,
    path: conn.path,
    responseChannel: `${config.webSocket.redis?.responseChannel}.${config.instanceId}`,
    remoteAddress: conn.remoteAddress,
    remotePort: conn.remotePort,
  };

  const onRequestResult = (serviceConfig.onRequest &&
    (await serviceConfig.onRequest(request))) || {
    handled: false as false,
    request: JSON.stringify(request),
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
    publish(channel, onRequestResult.request);
  }
}
