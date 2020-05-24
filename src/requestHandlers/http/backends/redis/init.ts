import * as configModule from "../../../../config";
import { HttpMethods } from "../../../../types";
import { createClients, getSubscriber, getPublisher } from "./clients";
import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";
import { RouteConfig } from "../../../../types/httpRequests";

export default async function init() {
  const config = configModule.get();

  if (isRedisBeingUsed()) {
    await createClients(config.redis?.options);

    // Setup subscriptions
    const alreadySubscribed: string[] = [];

    if (config.http) {
      const httpClientSubscriber = getSubscriber();
      httpClientSubscriber.on("message", processMessage(config.http));
      for (const route in config.http.routes) {
        for (const method in config.http.routes[route]) {
          const routeConfig = config.http.routes[route][
            method as HttpMethods
          ] as RouteConfig;
          for (const service in routeConfig.services) {
            const serviceConfig = routeConfig.services[service];
            if (serviceConfig.type === "redis") {
              const channel = `${serviceConfig.config.responseChannel}.${config.instanceId}`;
              if (!alreadySubscribed.includes(channel)) {
                httpClientSubscriber.subscribe(channel);
              }
            }
          }
        }
      }

      // Some services may never respond. Fail them.
      setInterval(
        cleanupTimedOut(config.http),
        config.redis?.cleanupInterval || 10000
      );
    }

    if (config.websockets) {
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

function isRedisBeingUsed(): boolean {
  const config = configModule.get();

  if (config.http) {
    for (const route in config.http.routes) {
      for (const method in config.http.routes[route]) {
        const routeConfig = config.http.routes[route][
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
  }

  if (config.websockets) {
    for (const route in config.websockets.routes) {
      const routeConfig = config.websockets.routes[route];
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
