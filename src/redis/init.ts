import * as configModule from "../config";
import { HttpMethods, RouteConfig } from "../types";
import { createClients, getSubscriber, getPublisher } from "./clients";
import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";

export default async function init() {
  const config = configModule.get();

  if (channelsDefined()) {
    await createClients(config.redis?.options);

    const subscriber = getSubscriber();
    const publisher = getPublisher();

    // Setup subscriptions
    for (const route in config.routes) {
      for (const method in config.routes[route]) {
        const routeConfig = config.routes[route][
          method as HttpMethods
        ] as RouteConfig;
        for (const service in routeConfig.services) {
          const channels = routeConfig.services[service].redis;
          if (channels) {
            subscriber.subscribe(channels.responseChannel);
          }
        }
      }
    }

    subscriber.on("message", processMessage);
  }

  // Some services may never respond. Fail them.
  setInterval(cleanupTimedOut, config.cleanupIntervalMS || 10000);
}

function channelsDefined(): boolean {
  const config = configModule.get();

  for (const route in config.routes) {
    for (const method in config.routes[route]) {
      const routeConfig = config.routes[route][
        method as HttpMethods
      ] as RouteConfig;
      for (const service in routeConfig.services) {
        if (routeConfig.services[service].redis) {
          return true;
        }
      }
    }
  }

  return false;
}
