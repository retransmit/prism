import { createClient } from "redis";

import { promisify } from "util";
import { HttpResponse } from "../../../../types/http";
import { HttpServiceCacheConfig } from "../../../../types/httpServiceCaching";
import { AppConfig } from "../../../../types";

const redisGet = promisify(createClient().get);
const redisPSetex = promisify(createClient().psetex);

const ONE_MINUTE = 60 * 1000;

export async function get(
  key: string,
  cacheConfig: HttpServiceCacheConfig,
  config: AppConfig
): Promise<HttpResponse | undefined> {
  const client = createClient(config.redis?.options);
  const redisKey = `cache_item:${key}`;
  const response = await redisGet.call(client, redisKey);
  if (response) {
    return JSON.parse(response);
  }
}

export async function set(
  key: string,
  response: HttpResponse,
  cacheConfig: HttpServiceCacheConfig,
  config: AppConfig
) {
  const expiry = cacheConfig.expiry || ONE_MINUTE;
  const client = createClient(config.redis?.options);
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
