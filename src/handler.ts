import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import {
  HttpMethods,
  FetchedResponse,
  HttpResponse,
  IAppConfig,
} from "./types";
import randomId from "./random";
import invokeHttpServices from "./requestHandlers/http/backends/http/invokeServices";
import rollbackHttp from "./requestHandlers/http/backends/http/rollback";
import invokeRedisServices from "./requestHandlers/http/backends/redis/invokeServices";
import rollbackRedis from "./requestHandlers/http/backends/redis/rollback";
import mergeResponses from "./mergeResponses";
import responseIsError from "./lib/http/responseIsError";
import HttpRequestContext from "./requestHandlers/http/HttpRequestContext";

const connectors = [
  { type: "http", invokeServices: invokeHttpServices, rollback: rollbackHttp },
  {
    type: "redis",
    invokeServices: invokeRedisServices,
    rollback: rollbackRedis,
  },
];

export type InvokeServiceResult =
  | { skip: true }
  | { skip: false; response: FetchedResponse };

/*
  Make an HTTP request handler
*/
export function createHandler(method: HttpMethods) {
  return async function httpHandler(ctx: IRouterContext) {
    return await handler(new HttpRequestContext(ctx), method);
  };
}

export async function handler(ctx: HttpRequestContext, method: HttpMethods) {
  const config = configModule.get();

  const requestId = randomId(32);
  const routeConfig = config.http.routes[ctx.getPath()][method];

  // If there are custom handlers, try that first.
  const onRequest = routeConfig?.onRequest || config.http.onRequest;
  if (onRequest) {
    const modResult = await onRequest(ctx);
    if (modResult.handled) {
      return;
    }
  }

  if (routeConfig) {
    const httpRequest = {
      path: ctx.getPath(),
      method,
      params: ctx.getParams(),
      query: ctx.getQuery(),
      body: ctx.getRequestBody(),
      headers: ctx.getRequestHeaders(),
    };

    let promises: Promise<
      InvokeServiceResult
    >[] = [];
    for (const connector of connectors) {
      promises = promises.concat(
        connector.invokeServices(requestId, httpRequest)
      );
    }

    const interimResponses = await Promise.all(promises);

    function responseIsNotSkipped(
      x: InvokeServiceResult
    ): x is { skip: false; response: FetchedResponse } {
      return !x.skip;
    }
    const validResponses = interimResponses
      .filter(responseIsNotSkipped)
      .map((x) => x.response);

    const fetchedResponses = routeConfig.mergeResponses
      ? await routeConfig.mergeResponses(validResponses)
      : validResponses;

    let response = mergeResponses(requestId, fetchedResponses);

    if (responseIsError(response)) {
      if (config.http.onError) {
        config.http.onError(fetchedResponses, httpRequest);
      }
      for (const connector of connectors) {
        connector.rollback(requestId, httpRequest);
      }
    }

    // See if there are any custom handlers for final response
    const onResponse = routeConfig.onResponse || config.http.onResponse;
    if (onResponse) {
      const modResult = await onResponse(ctx, response);
      if (modResult.handled) {
        return;
      }
    }

    // Send response back to the client.
    if (response) {
      if (
        response.status &&
        response.status >= 500 &&
        response.status <= 599 &&
        (routeConfig.genericErrors || config.http.genericErrors)
      ) {
        ctx.setResponseStatus(500);
        ctx.setResponseBody(`Internal Server Error.`);
      } else {
        // Redirect and return
        if (response.redirect) {
          ctx.redirect(response.redirect);
          return;
        }

        // HTTP status
        if (response.status) {
          ctx.setResponseStatus(response.status);
        }

        // Content type
        if (response.contentType) {
          ctx.setResponseType(response.contentType);
        }

        // Response body
        ctx.setResponseBody(response.content);

        // Headers of type IncomingHttpHeaders
        if (response.headers) {
          Object.keys(response.headers).forEach((field) => {
            const value = response?.headers
              ? response?.headers[field]
              : undefined;
            if (value) {
              ctx.setResponseHeader(field, value);
            }
          });
        }

        // Cookies!
        if (response.cookies) {
          for (const cookie of response.cookies) {
            ctx.setCookie(cookie.name, cookie.value, {
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
    }
  } else {
    // 404 not found
    ctx.setResponseStatus(404);
    ctx.setResponseBody("Not found.");
  }
}
