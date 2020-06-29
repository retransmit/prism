import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketRequestHandlerConfig,
  RedisServiceWebSocketConnectRequest,
  ActiveWebSocketConnection,
} from "../../../../types/webSocket";
import * as configModule from "../../../../config";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import respondToWebSocketClient from "../../respond";
import { publish } from "./publish";

export default async function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: RedisServiceWebSocketRequestHandlerConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();

  const channel = getChannelForService(
    serviceConfig.requestChannel,
    serviceConfig.numRequestChannels
  );

  const request: RedisServiceWebSocketConnectRequest = {
    id: requestId,
    type: "connect",
    route: conn.route,
    path: conn.path,
    responseChannel: `${webSocketConfig.redis?.responseChannel}.${config.instanceId}`,
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
        webSocketConfig
      );
    }
  } else {
    publish(channel, onRequestResult.request);
  }
}
