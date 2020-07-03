import redis = require("redis");
import { AppConfig } from "../../../../types";

let publisher: redis.RedisClient;

export function init(config: AppConfig) {
  publisher = redis.createClient(config.redis?.options);
}

export function publish(channel: string, message: string) {
  publisher.publish(channel, message);
}

