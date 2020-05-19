import * as configModule from "../../config";
import { HttpMethods, RouteConfig } from "../../types";
import { createClients, getSubscriber, getPublisher } from "./clients";
import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";

export default async function init() {
  const config = configModule.get();

  if (isRedisBeingUsed()) {
    await createClients(config.redis?.options);

    const subscriber = getSubscriber();
    const publisher = getPublisher();

    // Setup subscriptions
    const alreadySubscribed: string[] = [];
    for (const route in config.routes) {
      for (const method in config.routes[route]) {
        const routeConfig = config.routes[route][
          method as HttpMethods
        ] as RouteConfig;
        for (const service in routeConfig.services) {
          const serviceConfig = routeConfig.services[service];
          if (serviceConfig.type === "redis") {
            const channel = serviceConfig.config.responseChannel;
            if (!alreadySubscribed.includes(channel)) {
              subscriber.subscribe(channel);
            }
          }
        }
      }
    }

    subscriber.on("message", processMessage);
  
    // Some services may never respond. Fail them.
    setInterval(cleanupTimedOut, config.cleanupIntervalMS || 10000);
  }

}

function isRedisBeingUsed(): boolean {
  const config = configModule.get();

  for (const route in config.routes) {
    for (const method in config.routes[route]) {
      const routeConfig = config.routes[route][
        method as HttpMethods
      ] as RouteConfig;
      for (const service in routeConfig.services) {
        const servicesConfig = routeConfig.services[service];
        if (servicesConfig.type === "redis") {
          return true;
        }
      }
    }
  }

  return false;
}
