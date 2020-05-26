import WebSocket from "ws";
import { WebSocketProxyConfig } from "../../../../types";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { RedisServiceWebSocketRequest, RedisServiceWebSocketMessageRequest } from "../../../../types/webSocketRequests";
import * as configModule from "../../../../config";
import { ActiveWebSocketConnection } from "../../activeConnections";
import respond from "../../respond";

export default async function sendToService(
  requestId: string,
  message: string,
  route: string,
  conn: ActiveWebSocketConnection,
  websocketConfig: WebSocketProxyConfig
) {
  const config = configModule.get();
  const routeConfig = websocketConfig.routes[route];

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "redis") {
      const websocketRequest: RedisServiceWebSocketMessageRequest = {
        id: requestId,
        type: "message",
        route,
        responseChannel: `${serviceConfig.config.requestChannel}.${config.instanceId}`,
        request: message,
      };

      const requestChannel = getChannelForService(
        serviceConfig.config.requestChannel,
        serviceConfig.config.numRequestChannels
      );

      const onRequestResult = serviceConfig.onRequest
        ? await serviceConfig.onRequest(websocketRequest)
        : { handled: false as false, request: message };

      if (onRequestResult.handled) {
        respond(onRequestResult.response, conn, websocketConfig);
      } else {
        if (!alreadyPublishedChannels.includes(requestChannel)) {
          alreadyPublishedChannels.push(requestChannel);
          getPublisher().publish(
            requestChannel,
            JSON.stringify(onRequestResult.request)
          );
        }
      }
    }
  }
}
