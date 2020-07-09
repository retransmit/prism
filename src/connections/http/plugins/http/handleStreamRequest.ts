import {
  HttpRequest,
  HttpMethods,
  HttpProxyAppConfig,
} from "../../../../types";

import {
  HttpRouteConfig,
  NativeHttpServiceEndPointConfig,
  HttpServiceEndPointConfig,
} from "../../../../types/http";
import { IRouterContext } from "koa-router";
import got from "got/dist/source";
import selectRandomUrl from "../../../../utils/http/selectRandomUrl";
import { replaceParamsInUrl } from "./replaceParamsInUrl";
import { makeGotOptions } from "../../../../utils/http/gotUtil";

// Handle streaming http request/response
export default async function handleStreamRequest(
  ctx: IRouterContext,
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  serviceConfig: HttpServiceEndPointConfig,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
): Promise<void> {
  if (isNativeHttpServiceConfig(serviceConfig)) {
    const params = request.params || {};

    const serviceUrl = await selectRandomUrl(
      serviceConfig.url,
      serviceConfig.getUrl
    );

    const urlWithParamsReplaced = replaceParamsInUrl(params, serviceUrl);
    const options = makeGotOptions(
      request,
      serviceConfig.contentEncoding,
      serviceConfig.contentType,
      undefined,
      true
    );
    const requestStream = got.stream(urlWithParamsReplaced, {
      ...options,
      throwHttpErrors: false,
    });

    ctx.body = requestStream;
  }
}

function isNativeHttpServiceConfig(
  x: HttpServiceEndPointConfig
): x is NativeHttpServiceEndPointConfig {
  return x.type === "http";
}
