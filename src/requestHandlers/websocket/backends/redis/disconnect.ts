import { WebSocketProxyConfig } from "../../../../types";
import {
  RedisServiceWebSocketHandlerConfig,
  RedisServiceWebSocketRequest,
  WebSocketDisconnectRequest,
} from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { ActiveWebSocketConnection } from "../../activeConnections";

export default function disconnect(
  requestId: string,
  conn: ActiveWebSocketConnection,
  handlerConfig: RedisServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {
  const channel = getChannelForService(
    handlerConfig.requestChannel,
    handlerConfig.numRequestChannels
  );

  const request: WebSocketDisconnectRequest = {
    id: requestId,
    route: conn.route,
    type: "disconnect",
  };

  getPublisher().publish(channel, JSON.stringify(request));
}
