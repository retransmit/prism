import { IRouterContext } from "koa-router";
import {
  HttpMethods,
  HttpRequest,
  HttpResponse,
  IAppConfig,
  HttpProxyConfig,
} from "../../types";
import { HttpRouteConfig } from "../../types/http";
import { updateServiceTrackingInfo } from "./modules/circuitBreaker";
import { updateCache } from "./modules/caching";
import responseIsError from "../../utils/http/responseIsError";

export async function sendResponse(
  ctx: IRouterContext,
  route: string,
  method: HttpMethods,
  requestTime: number,
  request: HttpRequest,
  response: HttpResponse | undefined,
  routeConfig: HttpRouteConfig | undefined,
  httpConfig: HttpProxyConfig,
  config: IAppConfig,
  fromCache = false
) {
  const responseTime = Date.now();

  if (response) {
    if (routeConfig && !fromCache) {
      updateServiceTrackingInfo(
        route,
        method,
        response.status,
        requestTime,
        responseTime,
        routeConfig,
        httpConfig,
        config
      );

      if (!responseIsError(response)) {
        updateCache(
          route,
          method,
          request,
          response,
          routeConfig,
          httpConfig,
          config
        );
      }
    }

    if (
      response.status &&
      response.status >= 500 &&
      response.status <= 599 &&
      (routeConfig?.genericErrors || httpConfig.genericErrors)
    ) {
      ctx.status = 500;
      ctx.body = `Internal Server Error.`;
    } else {
      // Redirect and return
      if (response.redirect) {
        ctx.redirect(response.redirect);
        return;
      }

      // HTTP status
      if (response.status) {
        ctx.status = response.status;
      }

      // Content type
      if (response.contentType) {
        ctx.type = response.contentType;
      }

      // Response body
      ctx.body = response.body;

      // Headers of type IncomingHttpHeaders
      if (response.headers) {
        Object.keys(response.headers).forEach((field) => {
          const value = response?.headers
            ? response?.headers[field]
            : undefined;
          if (value) {
            ctx.response.set(field, value);
          }
        });
      }

      // Cookies!
      if (response.cookies) {
        for (const cookie of response.cookies) {
          ctx.cookies.set(cookie.name, cookie.value, {
            domain: cookie.domain,
            path: cookie.path,
            maxAge: cookie.maxAge,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            overwrite: cookie.overwrite,
          });
        }
      }
    }
  } else {
    ctx.status = 404;
    ctx.body = "Not found.";
  }
}
