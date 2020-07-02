import {
  HttpMethods,
  RateLimitingConfig,
  RedisStateConfig,
  ClientTrackingInfo,
} from "../../../types";
import { createClient } from "redis";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

import { promisify } from "util";
const redisLRange = promisify(createClient().lrange);

export async function getTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  rateLimitingConfig: RateLimitingConfig,
  stateConfig: RedisStateConfig | undefined
): Promise<ClientTrackingInfo[] | undefined> {
  const client = createClient(stateConfig?.options);
  const key = `client_tracking:${remoteAddress}`;
  const jsonEntries = await redisLRange.call(client, key, 0, -1);
  return jsonEntries.map((x) => JSON.parse(x) as ClientTrackingInfo);
}

export async function setTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  trackingInfo: ClientTrackingInfo,
  rateLimitingConfig: RateLimitingConfig,
  stateConfig: RedisStateConfig | undefined
): Promise<void> {
  const client = createClient(stateConfig?.options);
  const key = `client_tracking:${remoteAddress}`;
  const jsonEntry = JSON.stringify(trackingInfo);
  const multi = client.multi();
  multi
    .lpush(key, jsonEntry)
    .ltrim(key, 0, stateConfig?.clientTrackingListLength || 2000)
    .pexpire(key, stateConfig?.clientTrackingListExpiry || TWO_MINUTES);
  multi.exec();
}
