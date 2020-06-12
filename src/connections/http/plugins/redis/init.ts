import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";
import { IAppConfig } from "../../../../types";
import redis = require("redis");

let subscriber: redis.RedisClient;

export default async function init(config: IAppConfig) {
  // Setup subscriptions
  
  if (config.http?.redis) {
    subscriber = redis.createClient(config.redis?.options);

    subscriber.on("message", processMessage(config.http));
    subscriber.subscribe(
      `${config.http.redis.responseChannel}.${config.instanceId}`
    );

    // Some services may never respond. Fail them.
    setInterval(
      cleanupTimedOut(config.http),
      config.http.redis.cleanupInterval || 10000
    );
  }
}
