import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  RedisServiceWebSocketConnectRequest,
} from "../../../../types/webSocketClients";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { ActiveWebSocketConnection } from "../../activeConnections";
import respondToWebSocketClient from "../../respond";

export default async function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  serviceConfig: RedisServiceWebSocketHandlerConfig,
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
    responseChannel: `${webSocketConfig.redis?.responseChannel}.${config.instanceId}`,
  };

  const onRequestResult = serviceConfig.onRequest
    ? await serviceConfig.onRequest(request)
    : { handled: false as false, request: JSON.stringify(request) };

  if (onRequestResult.handled) {
    if (onRequestResult.response) {
      respondToWebSocketClient(requestId, onRequestResult.response, conn, webSocketConfig);
    }
  } else {
    getPublisher().publish(channel, onRequestResult.request);
  }
}