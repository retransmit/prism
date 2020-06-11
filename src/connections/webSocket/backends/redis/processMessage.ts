import * as configModule from "../../../../config";
import { WebSocketProxyConfig } from "../../../../types";
import {
  WebSocketResponse,
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

    // Default to 'message' type.
    // Some services might forget to add this.
    redisResponse.type = redisResponse.type || "message";

    const conn = activeConnections().get(redisResponse.id);

    const serviceConfig = websocketConfig.routes[redisResponse.route].services[
      redisResponse.service
    ] as RedisServiceWebSocketHandlerConfig;

    if (conn) {
      const onResponseResult = serviceConfig.onResponse
        ? await serviceConfig.onResponse(redisResponse.id, messageString)
        : redisResponse;

      respond(redisResponse.id, onResponseResult, conn, websocketConfig);
    } else {
      const websocketRequest: WebSocketNotConnectedRequest = {
        id: redisResponse.id,
        type: "notconnected",
        route: redisResponse.route,
      };

      const requestChannel = getChannelForService(
        serviceConfig.requestChannel,
        serviceConfig.numRequestChannels
      );

      getPublisher().publish(requestChannel, JSON.stringify(websocketRequest));
    }
  };
}
