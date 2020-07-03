import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";
import { AppConfig, HttpServiceAppConfig } from "../../../../types";
import redis = require("redis");
import { init as initPublisher } from "./publish";
import { init as activeRequestsInit } from "./activeRequests";

let subscriber: redis.RedisClient;

export default async function init(config: HttpServiceAppConfig) {
  if (config.http?.redis) {
    subscriber = redis.createClient(config.redis?.options);

    subscriber.on("message", processMessage(config));
    subscriber.subscribe(
      `${config.http.redis.responseChannel}.${config.instanceId}`
    );

    // Some services may never respond. Fail them.
    setInterval(
      cleanupTimedOut(config.http),
      config.http.redis.cleanupInterval || 10000
    );

    initPublisher(config);
    activeRequestsInit();
  }
}
