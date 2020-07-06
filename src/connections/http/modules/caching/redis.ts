import {
  RedisStateConfig,
  HttpServiceCacheConfig,
  HttpResponse,
} from "../../../../types";
import { createClient } from "redis";

import { promisify } from "util";

const redisGet = promisify(createClient().get);
const redisPSetex = promisify(createClient().psetex);

const ONE_MINUTE = 60 * 1000;

export async function get(
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

export async function set(
  key: string,
  response: HttpResponse,
  stateConfig: RedisStateConfig,
  cacheConfig: HttpServiceCacheConfig
) {
  const expiry = cacheConfig.expiry || ONE_MINUTE;
  const client = createClient(stateConfig?.options);
  const redisKey = `cache_item:${key}`;
  await redisPSetex.call(client, redisKey, expiry, JSON.stringify(response));
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
