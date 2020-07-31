import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";
import { HttpMethods, HttpRequest } from "../../../../types/http";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";
import { AppConfig } from "../../../../types/config";
import { HttpServiceTrackingInfo } from ".";

export type HttpServiceTrackingStateProviderPlugin = {
  getTrackingInfo: (
    route: string,
    method: HttpMethods,
    config: AppConfig
  ) => Promise<HttpServiceTrackingInfo[] | undefined>;
  setTrackingInfo: (
    route: string,
    method: HttpMethods,
    trackingInfo: HttpServiceTrackingInfo,
    config: AppConfig
  ) => Promise<void>;
};

export const plugins: {
  [name: string]: HttpServiceTrackingStateProviderPlugin;
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

export default plugins;
