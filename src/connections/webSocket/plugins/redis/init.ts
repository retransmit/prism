import redis = require("redis");
import processMessage from "./processMessage";
import { WebSocketProxyAppConfig } from "../../../../types/config";
import { init as initPublisher } from "./publish";
import { promisify } from "util";

let client: redis.RedisClient;
const redisUnsubscribe = promisify(redis.createClient().unsubscribe);

export default async function init(config: WebSocketProxyAppConfig) {
  if (config.webSocket.redis) {
    if (client) {
      await redisUnsubscribe.call(client);
    }

    const channel = `${config.webSocket.redis.responseChannel}.${config.instanceId}`;
    client = redis.createClient(config.redis?.options);

    client.on("message", processMessage(config));
    client.subscribe(channel);

    initPublisher(config);
  }
}
