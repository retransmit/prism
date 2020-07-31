import { WebSocketProxyAppConfig } from "../../../../types/config";
import {
  WebSocketResponse,
  RedisWebSocketEndPointConfig,
  WebSocketNotConnectedRequest,
} from "../../../../types/config/webSocketProxy";
import { get as activeConnections } from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import { publish } from "./publish";

export default function processMessage(config: WebSocketProxyAppConfig) {
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
    ] as RedisWebSocketEndPointConfig;

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
