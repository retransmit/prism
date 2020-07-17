import { HttpMethods, AppConfig } from "../../../../types";
import { createClient } from "redis";
import { promisify } from "util";

const redisLRange = promisify(createClient().lrange);

import {
  HttpServiceTrackingInfo
} from "../../../../types";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

export async function getTrackingInfo(
  route: string,
  method: HttpMethods,
  config: AppConfig
): Promise<HttpServiceTrackingInfo[] | undefined> {
  if (config.state?.type === "redis") {
    const client = createClient(config.state.options);
    const key = getKey(config.hostId, route, method);
    const jsonEntries = await redisLRange.call(client, key, 0, -1);
    return jsonEntries.map(
      (x) => JSON.parse(x) as HttpServiceTrackingInfo
    );
  }
}

export async function setTrackingInfo(
  route: string,
  method: HttpMethods,
  trackingInfo: HttpServiceTrackingInfo,
  config: AppConfig
) {
  if (config.state?.type === "redis") {
    const client = createClient(config.state?.options);
    const key = getKey(config.hostId, route, method);
    const jsonEntry = JSON.stringify(trackingInfo);

    const multi = client.multi();
    multi
      .lpush(key, jsonEntry)
      .ltrim(key, 0, config.state.httpServiceErrorTrackingListLength || 2000)
      .pexpire(
        key,
        config.state.httpServiceErrorTrackingListExpiry || TWO_MINUTES
      );
    multi.exec();
  }
}

function getKey(hostId: string, route: string, method: HttpMethods) {
  return `http_service_error_tracking:${hostId}:${route}:${method}`;
}
