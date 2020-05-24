import redis = require("redis");
import { IAppConfig } from "../../../../types";

let subscriber: redis.RedisClient;
let publisher: redis.RedisClient;

export async function createClients(options: redis.ClientOpts | undefined) {
  subscriber = redis.createClient(options);
  publisher = redis.createClient(options);
}

export function getSubscriber() {
  return subscriber;
}

export function getPublisher() {
  return publisher;
}
