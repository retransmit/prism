import Koa = require("koa");
import bodyParser = require("koa-bodyparser");
import Router, { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import {
  HttpMethods,
  HttpProxyConfig,
  HttpRequest,
  HttpResponse,
  IAppConfig,
} from "../../types";
import randomId from "../../lib/random";

import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";

import mergeResponses from "./mergeResponses";
import responseIsError from "../../lib/http/responseIsError";

import {
  FetchedHttpRequestHandlerResponse,
  InvokeServiceResult,
  HttpRouteConfig,
  IHttpRequestHandlerPlugin,
} from "../../types/http";

const cors = require("@koa/cors");

const plugins: {
  [name: string]: IHttpRequestHandlerPlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
    rollback: httpPlugin.rollback,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
    rollback: redisPlugin.rollback,
  },
};

export type CreateHttpRequestHandler = (
  method: HttpMethods
) => (ctx: IRouterContext) => void;

export default async function init(config: IAppConfig) {
  if (config.http) {
    // Load other plugins.
    if (config.http.plugins) {
      for (const pluginName of Object.keys(config.http.plugins)) {
        plugins[pluginName] = require(config.http.plugins[pluginName].path);
      }
    }

    for (const pluginName of Object.keys(plugins)) {
      await plugins[pluginName].init(config);
    }

    const router = new Router();

    for (const route of Object.keys(config.http.routes)) {
      const routeConfig = config.http.routes[route];

      if (routeConfig.GET) {
        router.get(route, createHandler("GET", config));
      }

      if (routeConfig.POST) {
        router.post(route, createHandler("POST", config));
      }

      if (routeConfig.PUT) {
        router.put(route, createHandler("PUT", config));
      }

      if (routeConfig.DELETE) {
        router.del(route, createHandler("DELETE", config));
      }

      if (routeConfig.PATCH) {
        router.patch(route, createHandler("PATCH", config));
      }
    }

    const koa = new Koa();

    if (config.cors) {
      koa.use(cors(config.cors));
    }
    koa.use(bodyParser());
    koa.use(router.routes());
    koa.use(router.allowedMethods());
    const koaRequestHandler = koa.callback();

    return function httpRequestHandler(
      req: IncomingMessage,
      res: ServerResponse
    ) {
      koaRequestHandler(req, res);
    };
  }
}

function createHandler(method: HttpMethods, config: IAppConfig) {
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
      const modifiedRequest = modResult.request;

      let promises: Promise<InvokeServiceResult>[] = [];
      for (const pluginName of Object.keys(plugins)) {
        promises = promises.concat(
          plugins[pluginName].handleRequest(
            requestId,
            modifiedRequest,
            httpConfig
          )
        );
      }

      const allResponses = await Promise.all(promises);

      function responseIsNotSkipped(
        x: InvokeServiceResult
      ): x is { skip: false; response: FetchedHttpRequestHandlerResponse } {
        return !x.skip;
      }
      const validResponses = allResponses
        .filter(responseIsNotSkipped)
        .map((x) => x.response);

      const fetchedResponses = routeConfig.mergeResponses
        ? await routeConfig.mergeResponses(validResponses, originalRequest)
        : validResponses;

      let response = mergeResponses(requestId, fetchedResponses, httpConfig);

      if (responseIsError(response)) {
        const onError = routeConfig.onError || httpConfig.onError;
        if (onError) {
          onError(fetchedResponses, originalRequest);
        }
        for (const pluginName of Object.keys(plugins)) {
          plugins[pluginName].rollback(requestId, modifiedRequest, httpConfig);
        }
      }

      // Are there custom handlers for the response?
      const onResponse = routeConfig.onResponse || httpConfig.onResponse;
      const responseToSend = onResponse
        ? await onResponse(response, originalRequest)
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
    headers: copyHeadersFromContext(ctx.headers),
    remoteAddress: ctx.ip,
    remotePort: ctx.req.socket.remotePort,
  };
}

/*
  Don't copy the content-type and content-length headers.
  That's going to differ based on the backend service.
*/
function copyHeadersFromContext(headers: { [field: string]: string }) {
  return Object.keys(headers || {}).reduce(
    (acc, field) =>
      !["content-type", "content-length"].includes(field.toLowerCase())
        ? ((acc[field] = headers[field]), acc)
        : acc,
    {} as { [field: string]: string }
  );
}
