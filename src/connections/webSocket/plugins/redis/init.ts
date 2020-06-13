import redis = require("redis");
import processMessage from "./processMessage";
import { IAppConfig } from "../../../../types";

let subscriber: redis.RedisClient;

export default async function init(config: IAppConfig) {
  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.webSocket?.redis) {
    subscriber = redis.createClient(config.redis?.options);

    subscriber.on("message", processMessage(config.webSocket));
    subscriber.subscribe(
      `${config.webSocket.redis.responseChannel}.${config.instanceId}`
    );
  }
}