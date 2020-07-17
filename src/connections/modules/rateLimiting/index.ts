import {
  AppConfig,
  ClientTrackingInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
  HttpMethods,
  RateLimitingConfig,
  ClientTrackingStateProviderPlugin,
} from "../../../types";
import { HttpRouteConfig } from "../../../types/http";
import { WebSocketRouteConfig } from "../../../types/webSocket";
import plugins from "../clientTracking/plugins";

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

  if (rateLimitingConfig && rateLimitingConfig !== "none") {
    const rejectionMessage = "Too Many Requests.";
    const pluginType = config.state?.type || "memory";
    const trackingList = await plugins[pluginType].getTrackingInfo(
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
