import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  RedisServiceWebSocketConnectRequest,
} from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { ActiveWebSocketConnection } from "../../activeConnections";

export default function connect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  handlerConfig: RedisServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {  
  const config = configModule.get();

  const channel = getChannelForService(
    handlerConfig.requestChannel,
    handlerConfig.numRequestChannels
  );

  const request: RedisServiceWebSocketConnectRequest = {
    id: requestId,
    type: "connect",
    route: conn.route,
    responseChannel: `${websocketConfig.redis?.responseChannel}.${config.instanceId}`,
  };

  getPublisher().publish(channel, JSON.stringify(request));
}
