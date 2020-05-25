import * as configModule from "../../../../config";
import { HttpMethods, HttpProxyConfig } from "../../../../types";
import { getSubscriber } from "../../../../lib/redis/clients";
import processMessage from "./processMessage";
import cleanupTimedOut from "./cleanupTimedOut";
import { HttpRouteConfig } from "../../../../types/httpRequests";

export default async function init() {
  const config = configModule.get();

  // Setup subscriptions
  const alreadySubscribed: string[] = [];

  if (config.http) {
    if (isRedisBeingUsedForHttpRequests(config.http)) {
      const httpClientSubscriber = getSubscriber();
      httpClientSubscriber.on("message", processMessage(config.http));
      
      for (const route in config.http.routes) {
        for (const method in config.http.routes[route]) {
          const routeConfig = config.http.routes[route][
            method as HttpMethods
          ] as HttpRouteConfig;
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
  }
}

function isRedisBeingUsedForHttpRequests(httpConfig: HttpProxyConfig): boolean {
  for (const route in httpConfig.routes) {
    for (const method in httpConfig.routes[route]) {
      const routeConfig = httpConfig.routes[route][
        method as HttpMethods
      ] as HttpRouteConfig;
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
