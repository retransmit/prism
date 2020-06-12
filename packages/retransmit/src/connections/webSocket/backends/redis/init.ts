import * as configModule from "../../../../config";
import { getSubscriber } from "../../../../lib/redis/clients";
import { WebSocketProxyConfig } from "../../../../types";
import processMessage from "./processMessage";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.webSocket?.redis) {
    const websocketClientSubscriber = getSubscriber();
    websocketClientSubscriber.on("message", processMessage(config.webSocket));
    websocketClientSubscriber.subscribe(
      `${config.webSocket.redis.responseChannel}.${config.instanceId}`
    );
  }
}
