import { AppConfig } from "../../../../types/config";
import { createClient } from "redis";
import { promisify } from "util";
import { HttpMethods, HttpRequest } from "../../../../types/http";
import { HttpServiceTrackingInfo } from ".";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";

const redisLRange = promisify(createClient().lrange);

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

export async function getTrackingInfo(
  route: string,
  method: HttpMethods,
  config: AppConfig
): Promise<HttpServiceTrackingInfo[] | undefined> {
  if (config.state === "redis") {
    const client = createClient(config.redis?.options);
    const key = getKey(config.hostId, route, method);
    const jsonEntries = await redisLRange.call(client, key, 0, -1);
    return jsonEntries.map((x) => JSON.parse(x) as HttpServiceTrackingInfo);
  }
}

export async function setTrackingInfo(
  route: string,
  method: HttpMethods,
  trackingInfo: HttpServiceTrackingInfo,
  config: AppConfig
) {
  if (config.state === "redis") {
    const client = createClient(config.redis?.options);
    const key = getKey(config.hostId, route, method);
    const jsonEntry = JSON.stringify(trackingInfo);

    const multi = client.multi();
    multi
      .lpush(key, jsonEntry)
      .ltrim(
        key,
        0,
        config.http?.serviceTracking?.errorTrackingListLength || 2000
      )
      .pexpire(
        key,
        config.http?.serviceTracking?.errorTrackingListExpiry || TWO_MINUTES
      );
    multi.exec();
  }
}

function getKey(hostId: string, route: string, method: HttpMethods) {
  return `http_service_error_tracking:${hostId}:${route}:${method}`;
}
