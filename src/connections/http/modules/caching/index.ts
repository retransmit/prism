import { HttpProxyAppConfig, AppConfig } from "../../../../types";
import { HttpRouteConfig, HttpProxyConfig } from "../../../../types/httpProxy";
import { createHash } from "crypto";

import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";
import { HttpResponse, HttpMethods, HttpRequest } from "../../../../types/http";
import { HttpServiceCacheConfig } from "../../../../types/httpServiceCaching";

export type HttpServiceCacheStateProviderPlugin = {
  get: (
    key: string,
    cacheConfig: HttpServiceCacheConfig,
    config: AppConfig
  ) => Promise<HttpResponse | undefined>;
  set: (
    key: string,
    response: HttpResponse,
    cacheConfig: HttpServiceCacheConfig,
    config: AppConfig
  ) => Promise<void>;
};

const plugins: {
  [name: string]: HttpServiceCacheStateProviderPlugin;
} = {
  memory: {
    get: inMemoryPlugin.get,
    set: inMemoryPlugin.set,
  },
  redis: {
    get: redisPlugin.get,
    set: redisPlugin.set,
  },
};

/*
  Cache state is stored in memory by default,
  but production should use redis.
*/
export async function getFromCache(
  route: string,
  method: HttpMethods,
  request: HttpRequest,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
): Promise<HttpResponse | undefined> {
  const cacheConfig = routeConfig.caching || config.http.caching;

  if (cacheConfig) {
    const key = reduceRequestToHash(route, method, request, cacheConfig);
    return await plugins[config.state].get(key, cacheConfig, config);
  }
}

export async function updateCache(
  route: string,
  method: HttpMethods,
  request: HttpRequest,
  response: HttpResponse,
  routeConfig: HttpRouteConfig,
  config: HttpProxyAppConfig
) {
  const cacheConfig = routeConfig.caching || config.http.caching;

  if (cacheConfig) {
    const maxSize = cacheConfig.maxSize || 5000000;

    // Check if any of the params are bigger than it should be.
    if (!tooBig(maxSize, response)) {
      const key = reduceRequestToHash(route, method, request, cacheConfig);
      return await plugins[config.state].set(
        key,
        response,
        cacheConfig,
        config
      );
    }
  }
}

function reduceRequestToHash(
  route: string,
  method: HttpMethods,
  request: HttpRequest,
  cacheConfig: HttpServiceCacheConfig
) {
  const requestParams = {
    headers: requestFieldToArray(
      request.headers,
      cacheConfig.varyBy?.headers || []
    ),
    query: requestFieldToArray(
      request.headers,
      cacheConfig.varyBy?.query || []
    ),
    body: requestFieldToArray(request.headers, cacheConfig.varyBy?.body || []),
  };

  const jsonOfRequest = JSON.stringify(requestParams);
  const hashOfRequest = createHash("sha1")
    .update(jsonOfRequest)
    .digest("base64");

  return `${route}:${method}:${hashOfRequest}`;
}

function requestFieldToArray(
  requestProp:
    | {
        [field: string]: any;
      }
    | undefined,
  fields: string[] | undefined
) {
  return (fields || []).reduce((acc, prop) => {
    return acc.concat(requestProp ? [[prop, requestProp[prop]]] : []);
  }, [] as [string, any][]);
}

function tooBig(maxSize: number, response: HttpResponse) {
  return [response.headers, response.body].some((responseProp) => {
    responseProp !== undefined
      ? Object.keys(responseProp).some(
          (x) =>
            (typeof responseProp === "string"
              ? x
              : JSON.stringify(responseProp[x])
            ).length > maxSize
        )
      : false;
  });
}
