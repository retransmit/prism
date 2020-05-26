import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  WebSocketRequest,
} from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function connect(
  requestId: string,
  route: string,
  handlerConfig: RedisServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();

  const channel = getChannelForService(
    handlerConfig.config.requestChannel,
    handlerConfig.config.numRequestChannels
  );

  const request: WebSocketRequest = {
    id: requestId,
    type: "connect",
    route,
    responseChannel: `${websocketConfig.redis?.responseChannel}.${config.instanceId}`,
  };

  getPublisher().publish(channel, JSON.stringify(request));
}
