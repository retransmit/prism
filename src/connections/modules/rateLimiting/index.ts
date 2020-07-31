import { AppConfig, HttpProxyAppConfig } from "../../../types/config";
import plugins from "../clientTracking/plugins";
import { HttpMethods } from "../../../types/http";
import { ClientTrackingInfo } from "../clientTracking";
import { RateLimitingConfig } from "../../../types/config/rateLimiting";
import getHttpRouteConfig from "../../http/getRouteConfig";
import getWebSocketRouteConfig from "../../webSocket/getRouteConfig";

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export default async function applyRateLimiting(
  type: "http" | "webSocket",
  route: string,
  method: HttpMethods,
  remoteAddress: string,
  config: AppConfig
): Promise<{ status: number; body: any } | undefined> {
  let rateLimitingConfig: RateLimitingConfig | undefined =
    type === "http"
      ? (
          config.http?.routes[route][method] ||
          config.http?.routes[route]["ALL"]
        )?.rateLimiting || config.http?.rateLimiting
      : type === "webSocket"
      ? config.webSocket?.routes[route]?.rateLimiting ||
        config.http?.rateLimiting
      : undefined;

  if (rateLimitingConfig) {
    const rejectionMessage = "Too Many Requests.";
    const trackingList = await plugins[config.state].getTrackingInfo(
      route,
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
