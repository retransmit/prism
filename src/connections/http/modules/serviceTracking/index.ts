import {
  HttpMethods,
  HttpServiceTrackingInfo,
  HttpProxyAppConfig,
} from "../../../../types";
import { HttpRouteConfig } from "../../../../types/http";

import plugins from "./plugins";

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

    const pluginType = config.state?.type || "memory";
    plugins[pluginType].setTrackingInfo(route, method, trackingInfo, config);
  }
}

function isFailure(status: number) {
  return status >= 500;
}
