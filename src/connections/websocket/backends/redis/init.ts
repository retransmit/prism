import * as configModule from "../../../../config";
import { getSubscriber } from "../../../../lib/redis/clients";
import { WebSocketProxyConfig } from "../../../../types";
import processMessage from "./processMessage";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.websockets?.redis) {
    const websocketClientSubscriber = getSubscriber();
    websocketClientSubscriber.on("message", processMessage(config.websockets));
    websocketClientSubscriber.subscribe(
      `${config.websockets.redis.responseChannel}.${config.instanceId}`
    );

    // Some services may never respond. Fail them.
    // setInterval(
    //   cleanupTimedOut(config.websockets),
    //   config.websockets.redis.cleanupInterval || 10000
    // );
  }
}

