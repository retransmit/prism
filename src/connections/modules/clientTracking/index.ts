import {
  AppConfig,
  ClientTrackingInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
  HttpMethods,
} from "../../../types";
import { HttpRouteConfig } from "../../../types/http";
import { WebSocketRouteConfig } from "../../../types/webSocket";
import plugins from "./plugins";

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export default async function addTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  routeConfig: HttpRouteConfig | WebSocketRouteConfig,
  proxyConfig: HttpProxyConfig | WebSocketProxyConfig,
  config: AppConfig
) {
  const pluginType = config.state?.type || "memory";

  const trackingInfo: ClientTrackingInfo = {
    path,
    method,
    remoteAddress,
    instanceId: config.instanceId,
    timestamp: Date.now(),
  };

  plugins[pluginType].setTrackingInfo(
    path,
    method,
    remoteAddress,
    trackingInfo,
    config
  );
}
