import WebSocket from "ws";
import { WebSocketProxyConfig } from "../../../../types";
import { getPublisher } from "../../../../lib/redis/clients";
import { getChannelForService } from "../../../../lib/redis/getChannelForService";
import { WebSocketRequest } from "../../../../types/webSocketRequests";
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
      const redisRequest: WebSocketRequest = {
        id: requestId,
        type: "message",
        route,
        responseChannel: `${serviceConfig.config.requestChannel}.${config.instanceId}`,
        request: message,
      };

      if (serviceConfig.type === "redis") {
        const requestChannel = getChannelForService(
          serviceConfig.config.requestChannel,
          serviceConfig.config.numRequestChannels
        );

        const onRequestResult = serviceConfig.onRequest
          ? await serviceConfig.onRequest(redisRequest)
          : { handled: false as false, request: message };

        if (onRequestResult.handled) {
          respond(onRequestResult.response, service, conn, websocketConfig);
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
}
