import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import {
  HttpMethods,
  CollatedResult,
  FetchedResult,
  RequestData,
} from "./types";
import randomId from "./random";
import invokeServices from "./redis/invokeServices";
import mergeResponses from "./mergeResponses";
import { publish } from "./redis/publish";

/*
  Make an HTTP request handler
*/
export function createHandler(method: HttpMethods) {
  const config = configModule.get();

  return async function handler(ctx: IRouterContext) {
    // If there are custom handlers, try that first.
    if (config.handlers && config.handlers.request) {
      const result = config.handlers.request(ctx);
      if ((await result).handled) {
        return;
      }
    }

    const requestId = randomId(32);
    const routeConfig = config.routes[ctx.path][method];

    if (routeConfig) {
      const payload = {
        id: requestId,
        type: "request",
        data: {
          path: ctx.path,
          params: ctx.params,
          query: ctx.query,
          body: ctx.body,
          headers: ctx.headers,
        },
      };

      const promisesForRedisServices = invokeServices(
        payload,
        requestId,
        ctx.path,
        method
      );

      // TODO
      const promisesForAllServices = promisesForRedisServices.concat([]);

      const interimCollatedResults = await waitForPendingResponses(
        promisesForAllServices
      );

      const collatedResults =
        routeConfig.handlers && routeConfig.handlers.merge
          ? await routeConfig.handlers.merge(interimCollatedResults)
          : interimCollatedResults;

      if (collatedResults.aborted) {
        const errorPayload = {
          id: requestId,
          type: "rollback",
          data: payload.data,
        };
        publish(errorPayload, ctx.path, method);
      }

      let response = mergeResponses(requestId, collatedResults);

      // See if there are any custom handlers for final response
      if (config.handlers && config.handlers.response) {
        const result = await config.handlers.response(ctx, response);
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
