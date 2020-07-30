import { AppConfig } from "../../../types";
import { HttpRouteConfig, HttpProxyConfig } from "../../../types/httpProxy";
import {
  WebSocketRouteConfig,
  WebSocketProxyConfig,
} from "../../../types/webSocketProxy";
import plugins from "../clientTracking/plugins";
import { HttpMethods } from "../../../types/http";
import { ClientTrackingInfo } from "../clientTracking";
import { RateLimitingConfig } from "../../../types/rateLimiting";

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
  config: AppConfig
): Promise<{ status: number; body: any } | undefined> {
  const rateLimitingConfig =
    routeConfig.rateLimiting || proxyConfig.rateLimiting;

  if (rateLimitingConfig) {
    const rejectionMessage = "Too Many Requests.";
    const trackingList = await plugins[config.state].getTrackingInfo(
      path,
      method,
      remoteAddress,
      config
    );

    if (mustReject(trackingList || [], rateLimitingConfig)) {
      return {
        status: rateLimitingConfig.errorStatus || 429,
        body: rateLimitingConfig.errorBody || rejectionMessage,
      };
    }
  }
}

function mustReject(
  trackingInfoList: ClientTrackingInfo[],
  rateLimitingConfig: RateLimitingConfig
) {
  const now = Date.now();

  const requestsMade = trackingInfoList.filter(
    (x) => x.timestamp > now - rateLimitingConfig.duration
  ).length;

  return requestsMade > rateLimitingConfig.maxRequests;
}
