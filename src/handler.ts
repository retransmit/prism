import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import { HttpMethods, CollatedResult, FetchedResult } from "./types";
import randomId from "./random";
import invokeHttpServices from "./connectors/http/invokeServices";
import rollbackHttp from "./connectors/http/rollback";
import invokeRedisServices from "./connectors/redis/invokeServices";
import rollbackRedis from "./connectors/redis/rollback";
import mergeResponses from "./mergeResponses";

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
      const result = await modifyRequest(ctx);
      if (result.handled) {
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

      const promises: Promise<FetchedResult>[] = connectors.reduce(
        (acc, provider) =>
          acc.concat(provider.invokeServices(requestId, httpRequest)),
        [] as Promise<FetchedResult>[]
      );

      const interimCollatedResults = await waitForPendingResponses(promises);

      const collatedResults = routeConfig.mergeResults
        ? await routeConfig.mergeResults(interimCollatedResults)
        : interimCollatedResults;

      if (collatedResults.aborted) {
        for (const connector of connectors) {
          connector.rollback(requestId, httpRequest);
        }
      }

      let response = mergeResponses(requestId, collatedResults);

      // See if there are any custom handlers for final response
      const modifyResponse =
        routeConfig.modifyResponse || config.modifyResponse;
      if (modifyResponse) {
        const result = await modifyResponse(ctx, response);
        if (result.handled) {
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

/*
  Wait for responses
*/
async function waitForPendingResponses(
  promises: Promise<FetchedResult>[]
): Promise<CollatedResult> {
  try {
    return {
      aborted: false,
      results: await Promise.all(promises),
    };
  } catch (ex) {
    return {
      aborted: true,
      errorResult: ex,
    };
  }
}