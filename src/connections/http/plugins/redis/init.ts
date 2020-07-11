import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";
import { HttpProxyAppConfig } from "../../../../types";
import redis = require("redis");
import { init as initPublisher } from "./publish";
import { init as activeRequestsInit } from "./activeRequests";
import { promisify } from "util";

let client: redis.RedisClient;
const redisUnsubscribe = promisify(redis.createClient().unsubscribe);

export default async function init(config: HttpProxyAppConfig) {
  if (config.http?.redis) {
    if (client) {
      await redisUnsubscribe.call(client);
    }

    // Create a new client. 
    // Don't wanna use the old one.
    client = redis.createClient(config.redis?.options);

    const channel = `${config.http.redis.responseChannel}.${config.instanceId}`;

    client.on("message", processMessage(config));
    client.subscribe(channel);

    // Some services may never respond. Fail them.
    setInterval(
      () => cleanupTimedOut(),
      config.http.redis.cleanupInterval || 10000
    );

    initPublisher(config);
    activeRequestsInit();
  }
}
