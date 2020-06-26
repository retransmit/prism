import { WebSocketProxyConfig } from "../../../../types";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import {
  RedisServiceWebSocketRequest,
  RedisServiceWebSocketMessageRequest,
  WebSocketMessageRequest,
  ActiveWebSocketConnection,
  RedisServiceWebSocketRequestHandlerConfig,
} from "../../../../types/webSocket";
import * as configModule from "../../../../config";
import respondToWebSocketClient from "../../respond";
import { publish } from "./publish";

export default async function sendToService(
  request: WebSocketMessageRequest,
  conn: ActiveWebSocketConnection,
  webSocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();
  const routeConfig = webSocketConfig.routes[request.route];

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const cfg = routeConfig.services[service];
    if (cfg.type === "redis") {
      const serviceConfig = cfg;
      const redisRequest: RedisServiceWebSocketMessageRequest = {
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
            webSocketConfig
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
