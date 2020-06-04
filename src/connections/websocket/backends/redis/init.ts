import * as configModule from "../../../../config";
import { getSubscriber } from "../../../../lib/redis/clients";
import { WebSocketProxyConfig } from "../../../../types";
import processMessage from "./processMessage";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.websocket?.redis) {
    const websocketClientSubscriber = getSubscriber();
    websocketClientSubscriber.on("message", processMessage(config.websocket));
    websocketClientSubscriber.subscribe(
      `${config.websocket.redis.responseChannel}.${config.instanceId}`
    );

    // Some services may never respond. Fail them.
    // setInterval(
    //   cleanupTimedOut(config.websocket),
    //   config.websocket.redis.cleanupInterval || 10000
    // );
  }
}

