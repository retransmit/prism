import { WebSocketProxyAppConfig } from "../../../../types/config";
import { RedisWebSocketEndPointConfig } from "../../../../types/config/webSocketProxy";
import { get as activeConnections } from "../../activeConnections";
import respondToWebSocketClient from "../../respond";
import { publish } from "./publish";
import {
  WebSocketServiceNotConnectedRequest,
  RedisWebSocketServiceResponse,
} from "../../../../types/webSocket";

export default function processMessage(config: WebSocketProxyAppConfig) {
  return async function processMessageImpl(
    channel: string,
    messageString: string
  ) {
    const redisResponse = JSON.parse(
      messageString
    ) as RedisWebSocketServiceResponse;

    // Default to 'message' type.
    // Some services might forget to add this.
    redisResponse.type = redisResponse.type || "message";

    const conn = activeConnections().get(redisResponse.id);

    if (conn) {
      const serviceConfig = config.webSocket.routes[conn.route].services[
        redisResponse.service
      ] as RedisWebSocketEndPointConfig;

      if (serviceConfig) {
        const onResponseResult =
          (serviceConfig.onResponse &&
            (await serviceConfig.onResponse(redisResponse))) ||
          redisResponse;

        respondToWebSocketClient(onResponseResult, conn, config);
      } else {
        // TODO: Invoke error handler
      }
    } else {
      if (redisResponse.responseChannel) {
        const webSocketRequest: WebSocketServiceNotConnectedRequest = {
          id: redisResponse.id,
          type: "notconnected",
          route: "", // TODO - what do do here?
          remoteAddress: undefined,
          remotePort: undefined,
        };

        publish(
          redisResponse.responseChannel,
          JSON.stringify(webSocketRequest)
        );
      }
    }
  };
}
