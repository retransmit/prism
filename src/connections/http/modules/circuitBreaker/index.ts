import { HttpProxyAppConfig } from "../../../../types/config";
import { HttpRequest } from "../../../../types/http";
import { HttpServiceTrackingInfo } from "../serviceTracking";
import plugins from "../serviceTracking/plugins";
import { HttpProxyCircuitBreakerConfig } from "../../../../types/config/httpProxy/circuitBreaker";
import getRouteConfig from "../../getRouteConfig";

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export async function isTripped(
  route: string,
  request: HttpRequest,
  config: HttpProxyAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const routeConfig = getRouteConfig(route, request, config);
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || config.http.circuitBreaker;

  if (circuitBreakerConfig) {
    const rejectionMessage = "Busy.";
    const trackingList = await plugins[config.state].getTrackingInfo(
      route,
      request.method,
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
  circuitBreakerConfig: HttpProxyCircuitBreakerConfig
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
