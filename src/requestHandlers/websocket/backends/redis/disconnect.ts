import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  WebSocketRequest,
} from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function disconnect(
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
    responseChannel: `${websocketConfig.redis?.responseChannel}.${config.instanceId}`,
    route,
    type: "disconnect"
  };

  getPublisher().publish(channel, JSON.stringify(request));
}
