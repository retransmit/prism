import { IRouterContext } from "koa-router";
import * as configModule from "../../config";
import { HttpMethods, HttpProxyConfig } from "../../types";
import randomId from "../../lib/random";
import invokeHttpServices from "./backends/http/invokeServices";
import rollbackHttp from "./backends/http/rollback";
import invokeRedisServices from "./backends/redis/invokeServices";
import rollbackRedis from "./backends/redis/rollback";
import mergeResponses from "./mergeResponses";
import responseIsError from "../../lib/http/responseIsError";
import HttpRequestContext from "./RequestContext";
import {
  FetchedHttpHandlerResponse,
  InvokeServiceResult,
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
    return await handler(
      new HttpRequestContext(ctx),
      method,
      config.http as HttpProxyConfig
    );
  };
}

async function handler(
  ctx: HttpRequestContext,
  method: HttpMethods,
  httpConfig: HttpProxyConfig
) {
  const requestId = randomId(32);
  const routeConfig = httpConfig.routes[ctx.getPath()][method];

  // If there are custom handlers, try that first.
  const onRequest = routeConfig?.onRequest || httpConfig.onRequest;
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
      ? await routeConfig.mergeResponses(validResponses)
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

    // See if there are any custom handlers for final response
    const onResponse = routeConfig.onResponse || httpConfig.onResponse;
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
        (routeConfig.genericErrors || httpConfig.genericErrors)
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
