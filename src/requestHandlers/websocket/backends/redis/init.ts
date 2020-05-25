import * as configModule from "../../../../config";
import { getSubscriber } from "../../../../lib/redis/clients";
import { WebSocketProxyConfig } from "../../../../types";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.websockets) {
    if (isRedisBeingUsedForWebSockets(config.websockets)) {
      const websocketSubscriber = getSubscriber();
      for (const route in config.websockets.routes) {
        const routeConfig = config.websockets.routes[route];
        for (const service in routeConfig.services) {
          const serviceConfig = routeConfig.services[service];
          if (serviceConfig.type === "redis") {
            const channel = `${serviceConfig.config.responseChannel}.${config.instanceId}`;
            if (!alreadySubscribed.includes(channel)) {
              websocketSubscriber.subscribe(channel);
            }
          }
        }
      }
    }
  }
}

function isRedisBeingUsedForWebSockets(
  websocketConfig: WebSocketProxyConfig
): boolean {
  for (const route in websocketConfig.routes) {
    const routeConfig = websocketConfig.routes[route];
    for (const service in routeConfig.services) {
      const servicesConfig = routeConfig.services[service];
      if (servicesConfig.type === "redis") {
        return true;
      }
    }
  }

  return false;
}
