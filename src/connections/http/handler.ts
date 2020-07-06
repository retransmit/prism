import Koa = require("koa");
import bodyParser = require("koa-body");
import Router, { IRouterContext } from "koa-router";
import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import {
  HttpMethods,
  HttpRequest,
  AppConfig,
  HttpProxyAppConfig,
} from "../../types";
import randomId from "../../utils/random";

import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";

import mergeResponses from "./mergeResponses";
import responseIsError from "../../utils/http/responseIsError";

import {
  FetchedHttpResponse,
  InvokeHttpServiceResult,
  HttpServicePlugin,
  HttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../types/http";
import applyRateLimiting from "../modules/rateLimiting";
import { copyHeadersFromContext } from "./copyHeadersFromContext";
import { sendResponse } from "./sendResponse";
import { getFromCache } from "./modules/caching";
import authenticate from "./modules/authentication";
import { isTripped } from "./modules/circuitBreaker";

const cors = require("@koa/cors");

const plugins: {
  [name: string]: HttpServicePlugin;
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

export default async function init(config: AppConfig) {
  const koa = new Koa();

  if (config.cors) {
    koa.use(cors(config.cors));
  }

  if (isHttpServiceAppConfig(config)) {
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
      const methodConfig = config.http.routes[route];

      for (const method of Object.keys(methodConfig)) {
        const serviceConfig = methodConfig[method as HttpMethods];
        if (
          serviceConfig?.requestBodyIsStream ||
          serviceConfig?.requestBodyIsStream
        ) {
          if (Object.keys(serviceConfig.services).length > 1) {
            throw new Error(
              `The request or response for the route ${method} ${route} is defined as a stream but there are more than one services defined. This is not supported for now.`
            );
          }
        }
      }

      if (methodConfig.GET) {
        router.get(route, createHandler(route, methodConfig.GET, config));
      }

      if (methodConfig.POST) {
        if (
          methodConfig.POST.requestBodyIsStream ||
          methodConfig.POST.responseBodyIsStream
        ) {
          router.post(route, createHandler(route, methodConfig.POST, config));
        } else {
          router.post(
            route,
            bodyParser(),
            createHandler(route, methodConfig.POST, config)
          );
        }
      }

      if (methodConfig.PUT) {
        if (
          methodConfig.PUT.requestBodyIsStream ||
          methodConfig.PUT.responseBodyIsStream
        ) {
          router.put(route, createHandler(route, methodConfig.PUT, config));
        } else {
          router.put(
            route,
            bodyParser(),
            createHandler(route, methodConfig.PUT, config)
          );
        }
      }

      if (methodConfig.DELETE) {
        router.del(route, createHandler(route, methodConfig.DELETE, config));
      }

      if (methodConfig.PATCH) {
        if (
          methodConfig.PATCH.requestBodyIsStream ||
          methodConfig.PATCH.responseBodyIsStream
        ) {
          router.patch(route, createHandler(route, methodConfig.PATCH, config));
        } else {
          router.patch(
            route,
            bodyParser(),
            createHandler(route, methodConfig.PATCH, config)
          );
        }
      }

      if (methodConfig.ALL) {
        router.all(route, createHandler(route, methodConfig.ALL, config));
      }
    }

    koa.use(router.routes());
    koa.use(router.allowedMethods());
  }

  const koaRequestHandler = koa.callback();

  return function httpRequestHandler(
    req: IncomingMessage,
    res: ServerResponse
  ) {
    koaRequestHandler(req, res);
  };
}

function createHandler(
  route: string,
  routeConfig: HttpRouteConfig,
  config: AppConfig
) {
  return async function httpRequestHandler(ctx: IRouterContext) {
    return await handler(ctx, route, routeConfig, config);
  };
}

async function handler(
  ctx: IRouterContext,
  route: string,
  routeConfig: HttpRouteConfig,
  config: AppConfig
) {
  if (isHttpServiceAppConfig(config)) {
    const requestTime = Date.now();

    const request = makeHttpRequestFromContext(ctx);

    const requestId = randomId(32);

    const authConfig =
      routeConfig?.authentication || config.http.authentication;

    const authResponse = await authenticate(request, authConfig);

    const requestMethod = ctx.method as HttpMethods;

    if (authResponse) {
      sendResponse(
        ctx,
        route,
        requestMethod,
        requestTime,
        request,
        authResponse,
        routeConfig,
        config
      );
      return;
    }

    if (routeConfig) {
      const entryFromCache = await getFromCache(
        route,
        requestMethod,
        request,
        routeConfig,
        config
      );

      if (entryFromCache) {
        sendResponse(
          ctx,
          route,
          requestMethod,
          requestTime,
          request,
          entryFromCache,
          routeConfig,
          config,
          true
        );
        return;
      }

      const rateLimitedResponse = await applyRateLimiting(
        ctx.path,
        requestMethod,
        ctx.ip,
        routeConfig,
        config.http,
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
          requestMethod,
          requestTime,
          request,
          response,
          routeConfig,
          config
        );
        return;
      }

      const circuitBreakerResponse = await isTripped(
        route,
        requestMethod,
        routeConfig,
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
          requestMethod,
          requestTime,
          request,
          response,
          routeConfig,
          config
        );
        return;
      }
    }

    // Are there custom handlers for the request?
    const onRequest = routeConfig?.onRequest || config.http.onRequest;

    const modResult = (onRequest && (await onRequest(request))) || {
      handled: false as false,
      request: request,
    };

    if (modResult.handled) {
      sendResponse(
        ctx,
        route,
        requestMethod,
        requestTime,
        request,
        modResult.response,
        routeConfig,
        config
      );
    } else {
      if (routeConfig) {
        const modifiedRequest = modResult.request;

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

        const validResponses = await invokeRequestHandling(
          requestId,
          modifiedRequest,
          route,
          requestMethod,
          stages,
          config
        );

        const fetchedResponses =
          (routeConfig.mergeResponses &&
            (await routeConfig.mergeResponses(
              validResponses,
              request
            ))) ||
          validResponses;

        let response = mergeResponses(fetchedResponses, config);

        if (responseIsError(response)) {
          const onError = routeConfig.onError || config.http.onError;
          if (onError) {
            onError(fetchedResponses, request);
          }
          for (const pluginName of Object.keys(plugins)) {
            plugins[pluginName].rollback(
              requestId,
              modifiedRequest,
              route,
              requestMethod,
              config
            );
          }
        }

        // Are there custom handlers for the response?
        const onResponse = routeConfig.onResponse || config.http.onResponse;
        const responseToSend =
          (onResponse && (await onResponse(response, request))) ||
          response;

        sendResponse(
          ctx,
          route,
          requestMethod,
          requestTime,
          request,
          responseToSend,
          routeConfig,
          config
        );
      }
    }
  }
}

type StageConfig = {
  stage: number | undefined;
  services: {
    [name: string]: HttpServiceEndPointConfig;
  };
};

async function invokeRequestHandling(
  requestId: string,
  modifiedRequest: HttpRequest,
  route: string,
  method: HttpMethods,
  stages: StageConfig[],
  config: HttpProxyAppConfig
) {
  function responseIsNotSkipped(
    x: InvokeHttpServiceResult
  ): x is { skip: false; response: FetchedHttpResponse } {
    return !x.skip;
  }

  let responses: FetchedHttpResponse[] = [];

  for (const stage of stages) {
    let promises: Promise<InvokeHttpServiceResult>[] = [];

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
          config
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

function isHttpServiceAppConfig(
  config: AppConfig
): config is HttpProxyAppConfig {
  return typeof config.http !== "undefined";
}

function makeHttpRequestFromContext(ctx: IRouterContext): HttpRequest {
  return {
    path: ctx.path,
    method: ctx.method as HttpMethods,
    params: ctx.params,
    query: ctx.query,
    body:
      ctx.method === "GET" || ctx.method === "HEAD" || ctx.method === "DELETE"
        ? undefined
        : ctx.request.body,
    headers: copyHeadersFromContext(ctx.headers),
    remoteAddress: ctx.ip, // This handles 'X-Forwarded-For' etc.
    remotePort: ctx.req.socket.remotePort,
  };
}
