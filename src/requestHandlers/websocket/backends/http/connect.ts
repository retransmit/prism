import { WebSocketProxyConfig } from "../../../../types";
import { HttpServiceWebSocketHandlerConfig } from "../../../../types/webSocketRequests";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function connect(
  requestId: string,
  route: string,
  handlerConfig: HttpServiceWebSocketHandlerConfig,
  websocketConfig: WebSocketProxyConfig
) {}
