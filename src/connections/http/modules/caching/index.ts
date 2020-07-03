import {
  HttpMethods,
  HttpRequest,
  HttpServiceCacheConfig,
  HttpResponse,
  HttpProxyAppConfig
} from "../../../../types";
import {
  HttpRouteConfig,
  HttpServiceCacheStateProviderPlugin,
} from "../../../../types/http";
import { createHash } from "crypto";

import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";

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
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
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
  config: HttpProxyAppConfig
) {
  const cacheConfig = routeConfig.caching || config.http.caching;

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
            (typeof responseProp[x] !== "string"
              ? JSON.stringify(responseProp[x])
              : x
            ).length > maxSize
        )
      : false;
  });
}
