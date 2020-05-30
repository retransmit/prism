import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  RedisServiceWebSocketRequest,
  RedisServiceWebSocketConnectRequest,
  WebSocketConnectRequest,
} from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function connect(
  requestId: string,
  defaultRequest: WebSocketConnectRequest,
  route: string,
  handlerConfig: RedisServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();

  const channel = getChannelForService(
    handlerConfig.config.requestChannel,
    handlerConfig.config.numRequestChannels
  );

  const request: RedisServiceWebSocketConnectRequest = {
    id: requestId,
    type: "connect",
    route,
    responseChannel: `${websocketConfig.redis?.responseChannel}.${config.instanceId}`,
  };

  getPublisher().publish(channel, JSON.stringify(defaultRequest));
}
