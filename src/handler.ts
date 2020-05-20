import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import { HttpMethods, FetchedResponse, HttpResponse } from "./types";
import randomId from "./random";
import invokeHttpServices from "./connectors/http/invokeServices";
import rollbackHttp from "./connectors/http/rollback";
import invokeRedisServices from "./connectors/redis/invokeServices";
import rollbackRedis from "./connectors/redis/rollback";
import mergeResponses from "./mergeResponses";
import responseIsError from "./lib/http/responseIsError";

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
export function createHandler(method: HttpMethods) {
  const config = configModule.get();

  return async function handler(ctx: IRouterContext) {
    const requestId = randomId(32);
    const routeConfig = config.routes[ctx.path][method];

    // If there are custom handlers, try that first.
    const modifyRequest = routeConfig?.modifyRequest || config.modifyRequest;
    if (modifyRequest) {
      const modResult = await modifyRequest(ctx);
      if (modResult.handled) {
        return;
      }
    }

    if (routeConfig) {
      const httpRequest = {
        path: ctx.path,
        method: method,
        params: ctx.params,
        query: ctx.query,
        body: ctx.body,
        headers: ctx.headers,
      };

      const promises: Promise<FetchedResponse>[] = connectors.reduce(
        (acc, provider) =>
          acc.concat(provider.invokeServices(requestId, httpRequest)),
        [] as Promise<FetchedResponse>[]
      );

      const interimResponses = await Promise.all(promises);

      const fetchedResponses = routeConfig.mergeResponses
        ? await routeConfig.mergeResponses(interimResponses)
        : interimResponses;

      let response = mergeResponses(requestId, fetchedResponses);

      if (responseIsError(response)) {
        if (config.logError) {
          config.logError(fetchedResponses, httpRequest);
        }
        for (const connector of connectors) {
          connector.rollback(requestId, httpRequest);
        }
      }

      // See if there are any custom handlers for final response
      const modifyResponse =
        routeConfig.modifyResponse || config.modifyResponse;
      if (modifyResponse) {
        const modResult = await modifyResponse(ctx, response);
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
          (routeConfig.genericErrors || config.genericErrors)
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
      }
    } else {
      // 404 not found
      ctx.status = 404;
      ctx.body = "Not found.";
    }
  };
}
