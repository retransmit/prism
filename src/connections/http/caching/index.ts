import {
  IAppConfig,
  HttpProxyConfig,
  HttpMethods,
  HttpRequest,
  HttpServiceCacheConfig,
  HttpResponse,
} from "../../../types";
import {
  HttpRouteConfig,
  HttpServiceCacheProviderPlugin,
} from "../../../types/http";
import error from "../../../error";
import { createHash } from "crypto";

import * as inMemoryCachePlugin from "./inMemory";
import * as redisCachePlugin from "./redis";

const plugins: {
  [name: string]: HttpServiceCacheProviderPlugin;
} = {
  memory: {
    get: inMemoryCachePlugin.get,
    set: inMemoryCachePlugin.set,
  },
  redis: {
    get: redisCachePlugin.get,
    set: redisCachePlugin.set,
  },
};

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export async function getFromCache(
  route: string,
  method: string,
  request: HttpRequest,
  routeConfig: HttpRouteConfig,
  proxyConfig: HttpProxyConfig,
  config: IAppConfig
): Promise<HttpResponse | undefined> {
  const cacheConfig = routeConfig.caching || proxyConfig.caching;

  if (cacheConfig) {
    const key = reduceRequestToHash(route, method, request, cacheConfig);
    const pluginType = config.state?.type || "memory";
    return await plugins[pluginType].get(key, config.state);
  }
}

export async function updateCache(
  route: string,
  method: HttpMethods,
  request: HttpRequest,
  response: HttpResponse,
  routeConfig: HttpRouteConfig,
  proxyConfig: HttpProxyConfig,
  config: IAppConfig
) {
  const cacheConfig = routeConfig.caching || proxyConfig.caching;

  if (cacheConfig) {
    const maxSize = cacheConfig.maxSize || 5000000;

    // Check if any of the params are bigger than it should be.
    if (!tooBig(maxSize, response)) {
      const key = reduceRequestToHash(route, method, request, cacheConfig);
      const pluginType = config.state?.type || "memory";
      return await plugins[pluginType].set(
        key,
        response,
        config.state,
        cacheConfig
      );
    }
  }
}

function reduceRequestToHash(
  route: string,
  method: string,
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
            (typeof responseProp[x] !== "string"
              ? JSON.stringify(responseProp[x])
              : x
            ).length > maxSize
        )
      : false;
  });
}
