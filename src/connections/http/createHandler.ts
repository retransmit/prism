import { IRouterContext } from "koa-router";
import {
  HttpMethods,
  HttpRequest,
  AppConfig,
  HttpProxyAppConfig,
} from "../../types";
import randomId from "../../utils/random";

import mergeResponses from "./mergeResponses";
import responseIsError from "../../utils/http/responseIsError";

import {
  FetchedHttpResponse,
  InvokeHttpServiceResult,
  HttpServiceEndPointConfig,
  HttpRouteConfig,
} from "../../types/http";
import applyRateLimiting from "../modules/rateLimiting";
import { copyHeadersFromContext } from "./copyHeadersFromContext";
import { sendResponse } from "./sendResponse";
import { getFromCache } from "./modules/caching";
import authenticate from "./modules/authentication";
import { isTripped } from "./modules/circuitBreaker";
import isHttpServiceAppConfig from "./isHttpServiceAppConfig";
import plugins from "./plugins";

export type CreateHttpRequestHandler = (
  method: HttpMethods
) => (ctx: IRouterContext) => void;

export default function createHandler(
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

    const request = makeHttpRequestFromContext(ctx, routeConfig);

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

        const validResponses = await handleRequestsWithPlugins(
          requestId,
          modifiedRequest,
          route,
          requestMethod,
          stages,
          routeConfig,
          config
        );

        const fetchedResponses =
          (routeConfig.mergeResponses &&
            (await routeConfig.mergeResponses(validResponses, request))) ||
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
          (onResponse && (await onResponse(response, request))) || response;

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

async function handleRequestsWithPlugins(
  requestId: string,
  modifiedRequest: HttpRequest,
  route: string,
  method: HttpMethods,
  stages: StageConfig[],
  routeConfig: HttpRouteConfig,
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
          routeConfig,
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

function makeHttpRequestFromContext(
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
