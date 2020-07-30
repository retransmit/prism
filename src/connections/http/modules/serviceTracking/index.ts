import { HttpProxyAppConfig } from "../../../../types";
import { HttpRouteConfig } from "../../../../types/httpProxy";

import plugins from "./plugins";
import { HttpMethods } from "../../../../types/http";
import { AppConfig } from "../../../../types";

export type HttpServiceTrackingInfo = {
  route: string;
  method: HttpMethods;
  status: number;
  instanceId: string;
  timestamp: number;
  requestTime: number;
  responseTime: number;
};

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

export async function updateServiceTrackingInfo(
  route: string,
  method: HttpMethods,
  status: number | undefined,
  requestTime: number,
  responseTime: number,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
) {
  status = status || 200;

  if (isFailure(status)) {
    const trackingInfo: HttpServiceTrackingInfo = {
      route,
      method,
      status,
      instanceId: config.instanceId,
      timestamp: Date.now(),
      requestTime,
      responseTime,
    };

    plugins[config.state].setTrackingInfo(route, method, trackingInfo, config);
  }
}

function isFailure(status: number) {
  return status >= 500;
}
