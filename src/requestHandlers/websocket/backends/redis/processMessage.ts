import * as configModule from "../../../../config";
import { WebSocketProxyConfig } from "../../../../types";
import {
  WebSocketResponse,
  RedisServiceWebSocketRequest,
  RedisServiceWebSocketHandlerConfig,
  WebSocketNotConnectedRequest,
} from "../../../../types/webSocketRequests";
import { get as activeConnections } from "../../activeConnections";
import respond from "../../respond";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";

export default function processMessage(websocketConfig: WebSocketProxyConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const config = configModule.get();
    const redisResponse = JSON.parse(messageString) as WebSocketResponse;

    const conn = activeConnections().get(redisResponse.id);

    if (conn) {
      respond(redisResponse.id, redisResponse, conn, websocketConfig);
    } else {
      const serviceConfig = websocketConfig.routes[redisResponse.route]
        .services[redisResponse.service] as RedisServiceWebSocketHandlerConfig;

      const websocketRequest: WebSocketNotConnectedRequest = {
        id: redisResponse.id,
        type: "notconnected",
        route: redisResponse.route
      };

      const requestChannel = getChannelForService(
        serviceConfig.config.requestChannel,
        serviceConfig.config.numRequestChannels
      );

      getPublisher().publish(requestChannel, JSON.stringify(websocketRequest));
    }
  };
}
