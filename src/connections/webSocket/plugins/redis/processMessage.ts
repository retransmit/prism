import * as configModule from "../../../../config";
import { WebSocketProxyConfig } from "../../../../types";
import {
  WebSocketResponse,
  RedisServiceWebSocketRequestHandlerConfig,
  WebSocketNotConnectedRequest,
} from "../../../../types/webSocket";
import { get as activeConnections } from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { publish } from "./publish";

export default function processMessage(webSocketConfig: WebSocketProxyConfig) {
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

    const serviceConfig = webSocketConfig.routes[redisResponse.route].services[
      redisResponse.service
    ] as RedisServiceWebSocketRequestHandlerConfig;

    if (conn) {
      const onResponseResult =
        (serviceConfig.onResponse &&
          (await serviceConfig.onResponse(redisResponse.id, messageString))) ||
        redisResponse;

      respondToWebSocketClient(
        redisResponse.id,
        onResponseResult,
        conn,
        webSocketConfig
      );
    } else {
      const webSocketRequest: WebSocketNotConnectedRequest = {
        id: redisResponse.id,
        type: "notconnected",
        route: redisResponse.route,
      };

      const requestChannel = getChannelForService(
        serviceConfig.requestChannel,
        serviceConfig.numRequestChannels
      );

      publish(requestChannel, JSON.stringify(webSocketRequest));
    }
  };
}
