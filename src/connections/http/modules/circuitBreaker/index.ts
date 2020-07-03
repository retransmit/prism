import {
  AppConfig,
  HttpProxyConfig,
  HttpMethods,
  HttpServiceErrorTrackingInfo,
  HttpServiceCircuitBreakerConfig,
  HttpServiceAppConfig,
} from "../../../../types";
import {
  HttpRouteConfig,
  HttpServiceCircuitBreakerStateProviderPlugin,
} from "../../../../types/http";

import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";

const plugins: {
  [name: string]: HttpServiceCircuitBreakerStateProviderPlugin;
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
export async function isTripped(
  route: string,
  method: HttpMethods,
  routeConfig: HttpRouteConfig,
  config: HttpServiceAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const rejectionMessage = "Busy.";

  const circuitBreakerConfig =
    routeConfig.circuitBreaker || config.http.circuitBreaker;

  if (circuitBreakerConfig) {
    const pluginType = config.state?.type || "memory";
    const trackingList = await plugins[pluginType].getTrackingInfo(
      route,
      method,
      circuitBreakerConfig,
      config.state
    );
    if (mustReject(trackingList || [], circuitBreakerConfig)) {
      return {
        status: circuitBreakerConfig.errorStatus || 503,
        body: circuitBreakerConfig.errorResponse || rejectionMessage,
      };
    }
  }
}

export async function updateServiceTrackingInfo(
  route: string,
  method: HttpMethods,
  status: number | undefined,
  requestTime: number,
  responseTime: number,
  routeConfig: HttpRouteConfig,
  config: HttpServiceAppConfig
) {
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || config.http.circuitBreaker;

  const trackingInfo: HttpServiceErrorTrackingInfo = {
    route,
    method,
    status,
    requestTime,
    responseTime,
  };

  if (circuitBreakerConfig) {
    const isFailure =
      (circuitBreakerConfig.isFailure &&
        circuitBreakerConfig.isFailure(trackingInfo)) ||
      (trackingInfo.status && trackingInfo.status >= 500);

    if (isFailure) {
      if (circuitBreakerConfig) {
        const pluginType = config.state?.type || "memory";
        plugins[pluginType].setTrackingInfo(
          route,
          method,
          trackingInfo,
          circuitBreakerConfig,
          config.state
        );
      }
    }
  }
}

function mustReject(
  trackingInfoList: HttpServiceErrorTrackingInfo[],
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig
) {
  const now = Date.now();
  let errorCount = 0;

  for (const info of trackingInfoList) {
    if (info.responseTime > now - circuitBreakerConfig.duration) {
      errorCount++;
    }
    if (errorCount >= circuitBreakerConfig.maxErrors) {
      return true;
    }
  }
  return false;
}
