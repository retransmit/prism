import { IRouterContext } from "koa-router";
import { HttpRouteConfig } from "../../types/httpProxy";
import { HttpRequest, HttpMethods } from "../../types/http";
import { copyHeadersFromContext } from "./copyHeadersFromContext";

export default function makeHttpRequestFromContext(
  ctx: IRouterContext,
  routeConfig: HttpRouteConfig
): HttpRequest {
  return {
    path: ctx.path,
    method: ctx.method as HttpMethods,
    params: ctx.params,
    query: ctx.query,
    body:
      routeConfig.useStream ||
      ctx.method === "GET" ||
      ctx.method === "HEAD" ||
      ctx.method === "DELETE"
        ? undefined
        : ctx.request.body,
    headers: copyHeadersFromContext(ctx.headers),
    remoteAddress: ctx.ip, // This handles 'X-Forwarded-For' etc.
    remotePort: ctx.req.socket.remotePort,
  };
}