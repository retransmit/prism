import redis = require("redis");
import processMessage from "./processMessage";
import { WebSocketProxyAppConfig } from "../../../../types";
import { init as initPublisher } from "./publish";

let subscriber: redis.RedisClient;

export default async function init(config: WebSocketProxyAppConfig) {
  if (config.webSocket.redis) {
    subscriber = redis.createClient(config.redis?.options);

    subscriber.on("message", processMessage(config));
    subscriber.subscribe(
      `${config.webSocket.redis.responseChannel}.${config.instanceId}`
    );

    initPublisher(config);
  }
}
