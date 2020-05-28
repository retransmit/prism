import { IRouterContext } from "koa-router";
import * as configModule from "../../config";
import {
  HttpMethods,
  HttpProxyConfig,
  HttpRequest,
  HttpResponse,
} from "../../types";
import randomId from "../../lib/random";
import invokeHttpServices from "./backends/http/invokeServices";
import rollbackHttp from "./backends/http/rollback";
import invokeRedisServices from "./backends/redis/invokeServices";
import rollbackRedis from "./backends/redis/rollback";
import mergeResponses from "./mergeResponses";
import responseIsError from "../../lib/http/responseIsError";
import {
  FetchedHttpHandlerResponse,
  InvokeServiceResult,
  HttpRouteConfig,
} from "../../types/httpRequests";

const connectors = [
  { type: "http", invokeServices: invokeHttpServices, rollback: rollbackHttp },
  {
    type: "redis",
    invokeServices: invokeRedisServices,
    rollback: rollbackRedis,
  },
];

/*
  Make an HTTP request handler
*/
export default function createHandler(method: HttpMethods) {
  const config = configModule.get();
  return async function httpHandler(ctx: IRouterContext) {
    return await handler(ctx, method, config.http as HttpProxyConfig);
  };
}

async function handler(
  ctx: IRouterContext,
  method: HttpMethods,
  httpConfig: HttpProxyConfig
) {
  const originalRequest = makeHttpRequestFromContext(ctx);

  const requestId = randomId(32);
  const routeConfig = httpConfig.routes[originalRequest.path][method];

  // Are there custom handlers for the request?
  const onRequest = routeConfig?.onRequest || httpConfig.onRequest;

  const modResult = onRequest
    ? await onRequest(originalRequest)
    : { handled: false as false, request: originalRequest };

  if (modResult.handled) {
    sendResponse(ctx, modResult.response, routeConfig, httpConfig);
  } else {
    if (routeConfig) {
      const httpRequest = modResult.request;

      let promises: Promise<InvokeServiceResult>[] = [];
      for (const connector of connectors) {
        promises = promises.concat(
          connector.invokeServices(requestId, httpRequest, httpConfig)
        );
      }

      const interimResponses = await Promise.all(promises);

      function responseIsNotSkipped(
        x: InvokeServiceResult
      ): x is { skip: false; response: FetchedHttpHandlerResponse } {
        return !x.skip;
      }
      const validResponses = interimResponses
        .filter(responseIsNotSkipped)
        .map((x) => x.response);

      const fetchedResponses = routeConfig.mergeResponses
        ? await routeConfig.mergeResponses(validResponses, originalRequest)
        : validResponses;

      let response = mergeResponses(requestId, fetchedResponses, httpConfig);

      if (responseIsError(response)) {
        if (httpConfig.onError) {
          httpConfig.onError(fetchedResponses, httpRequest);
        }
        for (const connector of connectors) {
          connector.rollback(requestId, httpRequest, httpConfig);
        }
      }

      // Are there custom handlers for the response?
      const onResponse = routeConfig.onResponse || httpConfig.onResponse;
      const responseToSend = onResponse
        ? await onResponse(httpRequest, response)
        : response;

      sendResponse(ctx, responseToSend, routeConfig, httpConfig);
    }
  }
}

function sendResponse(
  ctx: IRouterContext,
  response: HttpResponse | undefined,
  routeConfig: HttpRouteConfig | undefined,
  httpConfig: HttpProxyConfig
) {
  if (response) {
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
      ctx.body = response.content;

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

function makeHttpRequestFromContext(ctx: IRouterContext): HttpRequest {
  return {
    path: ctx.path,
    method: ctx.method as HttpMethods,
    params: ctx.params,
    query: ctx.query,
    body: ctx.method === "GET" ? undefined : ctx.request.body,
    headers: ctx.headers,
    remoteAddress: ctx.ip,
    remotePort: ctx.req.socket.remotePort,
  };
}
