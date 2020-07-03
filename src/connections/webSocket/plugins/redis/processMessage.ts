import { WebSocketServiceAppConfig } from "../../../../types";
import {
  WebSocketResponse,
  RedisServiceWebSocketHandlerConfig,
  WebSocketNotConnectedRequest,
} from "../../../../types/webSocket";
import { get as activeConnections } from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import { publish } from "./publish";

export default function processMessage(config: WebSocketServiceAppConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const redisResponse = JSON.parse(messageString) as WebSocketResponse;

    // Default to 'message' type.
    // Some services might forget to add this.
    redisResponse.type = redisResponse.type || "message";

    const conn = activeConnections().get(redisResponse.id);

    const serviceConfig = config.webSocket.routes[redisResponse.route].services[
      redisResponse.service
    ] as RedisServiceWebSocketHandlerConfig;

    if (conn) {
      const onResponseResult =
        (serviceConfig.onResponse &&
          (await serviceConfig.onResponse(redisResponse.id, messageString))) ||
        redisResponse;

      respondToWebSocketClient(
        redisResponse.id,
        onResponseResult,
        conn,
        config
      );
    } else {
      const webSocketRequest: WebSocketNotConnectedRequest = {
        id: redisResponse.id,
        type: "notconnected",
        route: redisResponse.route,
        path: "",
        remoteAddress: undefined,
        remotePort: undefined,
      };

      const requestChannel = getChannelForService(
        serviceConfig.requestChannel,
        serviceConfig.numRequestChannels
      );

      publish(requestChannel, JSON.stringify(webSocketRequest));
    }
  };
}
