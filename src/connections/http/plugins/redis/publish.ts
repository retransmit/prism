import redis = require("redis");
import { IAppConfig } from "../../../../types";

let publisher: redis.RedisClient;

export function init(config: IAppConfig) {
  publisher = redis.createClient(config.redis?.options);
}

export function publish(channel: string, message: string) {
  publisher.publish(channel, message);
}

