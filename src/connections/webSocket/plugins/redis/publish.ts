import redis = require("redis");
import { AppConfig } from "../../../../types";

let client: redis.RedisClient;

export function init(config: AppConfig) {
  client = redis.createClient(config.redis?.options);
}

export function publish(channel: string, message: string) {
  client.publish(channel, message);
}

