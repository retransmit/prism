import * as configModule from "../../../../config";
import { getSubscriber } from "../../../../lib/redis/clients";
import { WebSocketProxyConfig, IAppConfig } from "../../../../types";
import processMessage from "./processMessage";

export default async function init(appConfig: IAppConfig) {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.webSocket?.redis) {
    const webSocketClientSubscriber = getSubscriber();
    webSocketClientSubscriber.on("message", processMessage(config.webSocket));
    webSocketClientSubscriber.subscribe(
      `${config.webSocket.redis.responseChannel}.${config.instanceId}`
    );
  }
}
