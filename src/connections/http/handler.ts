import Koa = require("koa");
import bodyParser = require("koa-bodyparser");
import Router, { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import {
  HttpMethods,
  HttpProxyConfig,
  HttpRequest,
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
  HttpRequestHandlerPlugin,
  HttpRequestHandlerConfig,
} from "../../types/http";
import applyRateLimiting from "../../lib/rateLimiting";
import { applyCircuitBreaker } from "./circuitBreaker";
import { copyHeadersFromContext } from "./copyHeadersFromContext";
import { sendResponse } from "./sendResponse";
import { getFromCache, updateCache } from "./caching";
import authenticate from "./authenticate";

const cors = require("@koa/cors");

const plugins: {
  [name: string]: HttpRequestHandlerPlugin;
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
        router.get(route, createHandler(route, "GET", config));
      }

      if (routeConfig.POST) {
        router.post(route, createHandler(route, "POST", config));
      }

      if (routeConfig.PUT) {
        router.put(route, createHandler(route, "PUT", config));
      }

      if (routeConfig.DELETE) {
        router.del(route, createHandler(route, "DELETE", config));
      }

      if (routeConfig.PATCH) {
        router.patch(route, createHandler(route, "PATCH", config));
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

function createHandler(route: string, method: HttpMethods, config: IAppConfig) {
  return async function httpHandler(ctx: IRouterContext) {
    return await handler(
      ctx,
      route,
      method,
      config.http as HttpProxyConfig,
      config
    );
  };
}

async function handler(
  ctx: IRouterContext,
  route: string,
  method: HttpMethods,
  httpConfig: HttpProxyConfig,
  config: IAppConfig
) {
  const requestTime = Date.now();

  const originalRequest = makeHttpRequestFromContext(ctx);

  const requestId = randomId(32);

  const routeConfig = httpConfig.routes[route][method];

  const authConfig = routeConfig?.authentication || httpConfig.authentication;

  if (authConfig && authConfig !== "none") {
    const jwt = authConfig.jwtHeaderField
      ? originalRequest.headers?.[authConfig.jwtHeaderField]
      : authConfig.jwtBodyField
      ? originalRequest.body?.[authConfig.jwtBodyField]
      : undefined;

    if (jwt) {
      const response = await authenticate(jwt, authConfig);
      if (response) {
        sendResponse(
          ctx,
          route,
          method,
          requestTime,
          originalRequest,
          response,
          routeConfig,
          httpConfig,
          config
        );
        return;
      }
    }
  }

  if (routeConfig) {
    const entryFromCache = await getFromCache(
      route,
      method,
      originalRequest,
      routeConfig,
      httpConfig,
      config
    );

    if (entryFromCache) {
      sendResponse(
        ctx,
        route,
        method,
        requestTime,
        originalRequest,
        entryFromCache,
        routeConfig,
        httpConfig,
        config,
        true
      );
      return;
    }

    const rateLimitedResponse = await applyRateLimiting(
      ctx.path,
      method,
      ctx.ip,
      routeConfig,
      httpConfig,
      config
    );

    if (rateLimitedResponse !== undefined) {
      const response = {
        status: rateLimitedResponse.status,
        body: rateLimitedResponse.body,
      };
      sendResponse(
        ctx,
        route,
        method,
        requestTime,
        originalRequest,
        response,
        routeConfig,
        httpConfig,
        config
      );
      return;
    }

    const circuitBreakerResponse = await applyCircuitBreaker(
      route,
      method,
      routeConfig,
      httpConfig,
      config
    );

    if (circuitBreakerResponse !== undefined) {
      const response = {
        status: circuitBreakerResponse.status,
        body: circuitBreakerResponse.body,
      };
      sendResponse(
        ctx,
        route,
        method,
        requestTime,
        originalRequest,
        response,
        routeConfig,
        httpConfig,
        config
      );
      return;
    }
  }

  // Are there custom handlers for the request?
  const onRequest = routeConfig?.onRequest || httpConfig.onRequest;

  const modResult = (onRequest && (await onRequest(originalRequest))) || {
    handled: false as false,
    request: originalRequest,
  };

  if (modResult.handled) {
    sendResponse(
      ctx,
      route,
      method,
      requestTime,
      originalRequest,
      modResult.response,
      routeConfig,
      httpConfig,
      config
    );
  } else {
    if (routeConfig) {
      const modifiedRequest = modResult.request;

      type StageConfig = {
        stage: number | undefined;
        services: {
          [name: string]: HttpRequestHandlerConfig;
        };
      };

      let stages: StageConfig[] = (function sortIntoStages() {
        const unsortedStages = Object.keys(routeConfig.services).reduce(
          (acc, serviceName) => {
            const serviceConfig = routeConfig.services[serviceName];
            const existingStage = acc.find(
              (x) => x.stage === serviceConfig.stage
            );
            if (!existingStage) {
              const newStage = {
                stage: serviceConfig.stage,
                services: {
                  [serviceName]: serviceConfig,
                },
              };
              return acc.concat(newStage);
            } else {
              existingStage.services[serviceName] = serviceConfig;
              return acc;
            }
          },
          [] as StageConfig[]
        );

        return unsortedStages.sort(
          (x, y) => (x.stage || Infinity) - (y.stage || Infinity)
        );
      })();

      async function invokeRequestHandling() {
        function responseIsNotSkipped(
          x: InvokeServiceResult
        ): x is { skip: false; response: FetchedHttpRequestHandlerResponse } {
          return !x.skip;
        }

        let responses: FetchedHttpRequestHandlerResponse[] = [];

        for (const stage of stages) {
          let promises: Promise<InvokeServiceResult>[] = [];

          for (const pluginName of Object.keys(plugins)) {
            promises = promises.concat(
              plugins[pluginName].handleRequest(
                requestId,
                modifiedRequest,
                route,
                method,
                stage.stage,
                responses,
                stage.services,
                httpConfig
              )
            );
          }

          const allResponses = await Promise.all(promises);

          const validResponses = allResponses
            .filter(responseIsNotSkipped)
            .map((x) => x.response);

          for (const response of validResponses) {
            responses.push(response);
          }
        }

        return responses;
      }

      const validResponses = await invokeRequestHandling();

      const fetchedResponses =
        (routeConfig.mergeResponses &&
          (await routeConfig.mergeResponses(
            validResponses,
            originalRequest
          ))) ||
        validResponses;

      let response = mergeResponses(fetchedResponses, httpConfig);

      if (responseIsError(response)) {
        const onError = routeConfig.onError || httpConfig.onError;
        if (onError) {
          onError(fetchedResponses, originalRequest);
        }
        for (const pluginName of Object.keys(plugins)) {
          plugins[pluginName].rollback(
            requestId,
            modifiedRequest,
            route,
            method,
            httpConfig
          );
        }
      }

      // Are there custom handlers for the response?
      const onResponse = routeConfig.onResponse || httpConfig.onResponse;
      const responseToSend =
        (onResponse && (await onResponse(response, originalRequest))) ||
        response;

      sendResponse(
        ctx,
        route,
        method,
        requestTime,
        originalRequest,
        responseToSend,
        routeConfig,
        httpConfig,
        config
      );
    }
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
    remoteAddress: ctx.ip, // This handles 'X-Forwarded-For' etc.
    remotePort: ctx.req.socket.remotePort,
  };
}
