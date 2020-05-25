import redis = require("redis");
import * as configModule from "../../config";

let subscriber: redis.RedisClient;
let publisher: redis.RedisClient;

export function init() {
  const config = configModule.get();
  subscriber = redis.createClient(config.redis?.options);
  publisher = redis.createClient(config.redis?.options);
}

export function getSubscriber() {
  return subscriber;
}

export function getPublisher() {
  return publisher;
}
