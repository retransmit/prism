import {
  IAppConfig,
  ClientTrackingInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
  HttpMethods,
  RateLimitingConfig,
  RateLimitingStateProviderPlugin,
} from "../../../types";
import { HttpRouteConfig } from "../../../types/http";
import { WebSocketRouteConfig } from "../../../types/webSocket";

const ONE_MINUTE = 60 * 1000;

import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";

const plugins: {
  [name: string]: RateLimitingStateProviderPlugin;
} = {
  memory: {
    getTrackingInfo: inMemoryPlugin.getTrackingInfo,
    setTrackingInfo: inMemoryPlugin.setTrackingInfo,
  },
  redis: {
    getTrackingInfo: redisPlugin.getTrackingInfo,
    setTrackingInfo: redisPlugin.setTrackingInfo,
  },
};

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export default async function applyRateLimiting(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  routeConfig: HttpRouteConfig | WebSocketRouteConfig,
  proxyConfig: HttpProxyConfig | WebSocketProxyConfig,
  config: IAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const rejectionMessage = "Too Many Requests.";
  const rateLimitingConfig =
    routeConfig.rateLimiting || proxyConfig.rateLimiting;

  if (rateLimitingConfig) {
    const pluginType = config.state?.type || "memory";
    const trackingList = await plugins[pluginType].getTrackingInfo(
      path,
      method,
      remoteAddress,
      rateLimitingConfig,
      config.state
    );

    if (mustReject(trackingList || [], rateLimitingConfig)) {
      return {
        status: rateLimitingConfig.errorStatus || 429,
        body: rateLimitingConfig.errorResponse || rejectionMessage,
      };
    } else {
      const trackingInfo: ClientTrackingInfo = {
        path,
        method,
        time: Date.now(),
      };

      plugins[pluginType].setTrackingInfo(
        path,
        method,
        remoteAddress,
        trackingInfo,
        rateLimitingConfig,
        config.state
      );
    }
  }
}

function mustReject(
  trackingInfoList: ClientTrackingInfo[],
  rateLimitingConfig: RateLimitingConfig
) {
  const now = Date.now();

  const requestsMade = trackingInfoList.filter(
    (x) => x.time > now - rateLimitingConfig.duration
  ).length;

  return requestsMade >= rateLimitingConfig.maxRequests;
}
