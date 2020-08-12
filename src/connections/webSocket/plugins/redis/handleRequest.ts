import { WebSocketProxyAppConfig } from "../../../../types/config";
import { getChannelForService } from "../../../../utils/redis/getChannelForService";
import {
  RedisWebSocketMessageRequest,
  WebSocketMessageRequest,
} from "../../../../types/config/webSocketProxy";
import respondToWebSocketClient from "../../respond";
import { publish } from "./publish";
import { ActiveWebSocketConnection } from "../../../../types/webSocket";

export default async function sendToService(
  request: WebSocketMessageRequest,
  conn: ActiveWebSocketConnection,
  config: WebSocketProxyAppConfig
) {
  const routeConfig = config.webSocket.routes[request.route];

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const cfg = routeConfig.services[service];
    if (cfg.type === "redis") {
      const serviceConfig = cfg;
      const redisRequest: RedisWebSocketMessageRequest = {
        ...request,
        responseChannel: `${serviceConfig.requestChannel}.${config.instanceId}`,
      };

      const requestChannel = getChannelForService(
        serviceConfig.requestChannel,
        serviceConfig.numRequestChannels
      );

      const onRequestResult = (serviceConfig.onRequest &&
        (await serviceConfig.onRequest(redisRequest))) || {
        handled: false as false,
        request: redisRequest,
      };

      if (onRequestResult.handled) {
        if (onRequestResult.response) {
          respondToWebSocketClient(
            request.id,
            onRequestResult.response,
            conn,
            config
          );
        }
      } else {
        if (!alreadyPublishedChannels.includes(requestChannel)) {
          alreadyPublishedChannels.push(requestChannel);
          publish(requestChannel, JSON.stringify(onRequestResult.request));
        }
      }
    }
  }
}
