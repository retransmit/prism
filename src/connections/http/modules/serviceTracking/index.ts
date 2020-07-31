import { HttpProxyAppConfig } from "../../../../types/config";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";
import { HttpMethods, HttpRequest, HttpResponse } from "../../../../types/http";
import plugins from "./plugins";

export type HttpServiceTrackingInfo = {
  route: string;
  method: HttpMethods;
  status: number;
  instanceId: string;
  timestamp: number;
  requestTime: number;
  responseTime: number;
};

export async function updateServiceTrackingInfo(
  route: string,
  request: HttpRequest,
  response: HttpResponse,
  requestTime: number,
  responseTime: number,
  config: HttpProxyAppConfig
) {
  const status = response.status || 200;

  if (isFailure(status)) {
    const trackingInfo: HttpServiceTrackingInfo = {
      route,
      method: request.method,
      status,
      instanceId: config.instanceId,
      timestamp: Date.now(),
      requestTime,
      responseTime,
    };

    plugins[config.state].setTrackingInfo(
      route,
      request.method,
      trackingInfo,
      config
    );
  }
}

function isFailure(status: number) {
  return status >= 500;
}
