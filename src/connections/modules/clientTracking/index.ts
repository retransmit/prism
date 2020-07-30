import {
  AppConfig,
} from "../../../types";
import { HttpRouteConfig, HttpProxyConfig } from "../../../types/httpProxy";
import { WebSocketRouteConfig, WebSocketProxyConfig } from "../../../types/webSocketProxy";
import plugins from "./plugins";
import { HttpMethods } from "../../../types/http";

export type ClientTrackingInfo = {
  path: string;
  method: HttpMethods;
  timestamp: number;
  instanceId: string;
  remoteAddress: string;
};

export type ClientTrackingStateProviderPlugin = {
  getTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    config: AppConfig
  ) => Promise<ClientTrackingInfo[] | undefined>;
  setTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    trackingInfo: ClientTrackingInfo,
    config: AppConfig
  ) => Promise<void>;
};


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
  const trackingInfo: ClientTrackingInfo = {
    path,
    method,
    remoteAddress,
    instanceId: config.instanceId,
    timestamp: Date.now(),
  };

  plugins[config.state].setTrackingInfo(
    path,
    method,
    remoteAddress,
    trackingInfo,
    config
  );
}
