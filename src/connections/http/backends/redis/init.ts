import * as configModule from "../../../../config";
import { HttpMethods, HttpProxyConfig } from "../../../../types";
import { getSubscriber } from "../../../../lib/redis/clients";
import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.http?.redis) {
    const httpClientSubscriber = getSubscriber();
    httpClientSubscriber.on("message", processMessage(config.http));
    httpClientSubscriber.subscribe(
      `${config.http.redis.responseChannel}.${config.instanceId}`
    );

    // Some services may never respond. Fail them.
    setInterval(
      cleanupTimedOut(config.http),
      config.http.redis.cleanupInterval || 10000
    );
  }
}
