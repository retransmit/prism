import {
  HttpRequest,
  HttpMethods,
  HttpProxyAppConfig,
} from "../../../../types";

import {
  InvokeHttpServiceResult,
  HttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../../../types/http";
import { IRouterContext } from "koa-router";

// Handle streaming http request/response
export default function handleStreamRequest(
  ctx: IRouterContext,
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  serviceConfig: HttpServiceEndPointConfig,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
): Promise<void> {
  // Not implemented.
  return {} as any;
}
