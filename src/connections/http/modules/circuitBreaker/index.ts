import { HttpProxyAppConfig } from "../../../../types";
import { HttpRouteConfig } from "../../../../types/httpProxy";

import plugins from "../serviceTracking/plugins";
import { HttpMethods } from "../../../../types/http";
import { HttpServiceTrackingInfo } from "../serviceTracking";
import { HttpServiceCircuitBreakerConfig } from "../../../../types/httpServiceCircuitBreaker";

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export async function isTripped(
  route: string,
  method: HttpMethods,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || config.http.circuitBreaker;

  if (circuitBreakerConfig) {
    const rejectionMessage = "Busy.";
    const trackingList = await plugins[config.state].getTrackingInfo(
      route,
      method,
      config
    );
    if (mustReject(trackingList || [], circuitBreakerConfig)) {
      return {
        status: circuitBreakerConfig.errorStatus || 503,
        body: circuitBreakerConfig.errorBody || rejectionMessage,
      };
    }
  }
}

function isFailure(status: number) {
  return status >= 500;
}

function mustReject(
  trackingInfoList: HttpServiceTrackingInfo[],
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig
) {
  const now = Date.now();
  let errorCount = 0;

  for (const info of trackingInfoList) {
    if (
      isFailure(info.status) &&
      info.responseTime > now - circuitBreakerConfig.duration
    ) {
      errorCount++;
    }
    if (errorCount >= circuitBreakerConfig.maxErrors) {
      return true;
    }
  }
  return false;
}
