import {
  IAppConfig,
  HttpProxyConfig,
  HttpMethods,
  InMemoryStateConfig,
  RedisStateConfig,
  HttpServiceErrorTrackingInfo,
  HttpServiceCircuitBreakerConfig,
  HttpRequest,
  HttpServiceCacheConfig,
  HttpResponse,
  IApplicationState,
} from "../../types";
import * as applicationState from "../../state";
import { HttpRouteConfig } from "../../types/http";
import error from "../../error";
import { createClient } from "redis";
import { createHash } from "crypto";

import { promisify } from "util";

const redisGet = promisify(createClient().get);
const redisSetex = promisify(createClient().setex);

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export async function checkCache(
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
    return config.state === undefined || config.state.type === "memory"
      ? await checkCacheWithInMemoryState(key)
      : config.state.type === "redis"
      ? checkCacheWithRedisState(key, config.state)
      : error(
          `Unsupported state type ${
            (config.state as any)?.type
          }. Valid values are 'memory' and 'redis'.`
        );
  }
}

async function checkCacheWithInMemoryState(
  key: string
): Promise<HttpResponse | undefined> {
  const state = applicationState.get();
  const cachedItem = state.cache.get(key);
  if (cachedItem) {
    return cachedItem.response;
  }
}

async function checkCacheWithRedisState(
  key: string,
  stateConfig: RedisStateConfig
): Promise<HttpResponse | undefined> {
  const client = createClient(stateConfig?.options);
  const redisKey = `cache_item:${key}`;
  const response = await redisGet.call(client, redisKey);
  if (response) {
    return JSON.parse(response);
  }
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

function reduceRequestToHash(
  route: string,
  method: string,
  request: HttpRequest,
  cacheConfig: HttpServiceCacheConfig
) {
  const requestParams = {
    headers: requestFieldToArray(request.headers, cacheConfig.varyBy.headers),
    query: requestFieldToArray(request.headers, cacheConfig.varyBy.query),
    body: requestFieldToArray(request.headers, cacheConfig.varyBy.body),
  };

  const jsonOfRequest = JSON.stringify(requestParams);
  const hashOfRequest = createHash("sha1")
    .update(jsonOfRequest)
    .digest("base64");

  return `${route}:${method}:${hashOfRequest}`;
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
      if (config.state === undefined || config.state.type === "memory") {
        await updateCacheEntryInMemory(key, response, cacheConfig);
      } else {
        await updateCacheEntryInRedis(key, response, cacheConfig, config.state);
      }
    }
  }
}

async function updateCacheEntryInMemory(
  key: string,
  response: HttpResponse,
  cacheConfig: HttpServiceCacheConfig
) {
  const state = applicationState.get();
  state.cache.set(key, {
    time: Date.now(),
    expiry: cacheConfig.expiry || ONE_MINUTE,
    response,
  });
}

async function updateCacheEntryInRedis(
  key: string,
  response: HttpResponse,
  cacheConfig: HttpServiceCacheConfig,
  stateConfig: RedisStateConfig
) {
  const expiry = cacheConfig.expiry || ONE_MINUTE;
  const client = createClient(stateConfig?.options);
  const redisKey = `cache_item:${key}`;
  await redisSetex.call(
    client,
    redisKey,
    cacheConfig.expiry || ONE_MINUTE,
    JSON.stringify(response)
  );
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
