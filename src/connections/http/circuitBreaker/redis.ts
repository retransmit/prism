import {
  HttpMethods,
} from "../../../types";
import { createClient } from "redis";
import { promisify } from "util";

const redisLRange = promisify(createClient().lrange);

import {
  HttpServiceErrorTrackingInfo,
  HttpServiceCircuitBreakerConfig,
  RedisStateConfig,
} from "../../../types";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

export async function getTrackingInfo(
  route: string,
  method: HttpMethods,
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
  stateConfig: RedisStateConfig | undefined
): Promise<HttpServiceErrorTrackingInfo[] | undefined> {
  const client = createClient(stateConfig?.options);
  const key = `http_service_error_tracking:${route}:${method}`;
  const jsonEntries = await redisLRange.call(client, key, 0, -1);
  return jsonEntries.map((x) => JSON.parse(x) as HttpServiceErrorTrackingInfo);
}

export async function setTrackingInfo(
  route: string,
  method: HttpMethods,
  trackingInfo: HttpServiceErrorTrackingInfo,
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
  stateConfig: RedisStateConfig | undefined
) {
  const client = createClient(stateConfig?.options);
  const key = `http_service_error_tracking:${route}:${method}`;
  const jsonEntry = JSON.stringify(trackingInfo);

  const multi = client.multi();
  multi
    .lpush(key, jsonEntry)
    .ltrim(key, 0, stateConfig?.httpServiceErrorTrackingListLength || 2000)
    .pexpire(
      key,
      stateConfig?.httpServiceErrorTrackingListExpiry || TWO_MINUTES
    );
  multi.exec();
}
