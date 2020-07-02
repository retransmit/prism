import {
  IAppConfig,
  ClientTrackingInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
  HttpMethods,
  InMemoryStateConfig,
  RateLimitingConfig,
  RedisStateConfig,
} from "../types";
import * as applicationState from "../state";
import { HttpRouteConfig } from "../types/http";
import { WebSocketRouteConfig } from "../types/webSocket";
import error from "../error";
import { createClient } from "redis";

import { promisify } from "util";

const redisLRange = promisify(createClient().lrange);

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export default async function applyRateLimiting(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  routeConfig: HttpRouteConfig | WebSocketRouteConfig,
  proxyConfig: HttpProxyConfig | WebSocketProxyConfig,
  config: IAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const rejectionMessage = "Too Many Requests.";
  const rateLimitingConfig =
    routeConfig.rateLimiting || proxyConfig.rateLimiting;

  if (rateLimitingConfig) {
    return config.state === undefined || config.state.type === "memory"
      ? await handleClientTrackingWithInMemoryState(
          rateLimitingConfig,
          config.state
        )
      : config.state.type === "redis"
      ? handleClientTrackingWithRedisState(rateLimitingConfig, config.state)
      : error(
          `Unsupported state type ${
            (config.state as any)?.type
          }. Valid values are 'memory' and 'redis'.`
        );
  }

  async function handleClientTrackingWithInMemoryState(
    rateLimitingConfig: RateLimitingConfig,
    stateConfig: InMemoryStateConfig | undefined
  ) {
    const state = applicationState.get();
    const trackingList = state.clientTracking.get(remoteAddress);

    const trackingInfo: ClientTrackingInfo = {
      path,
      method,
      time: Date.now(),
    };

    if (mustReject(trackingList || [], rateLimitingConfig)) {
      return {
        status: rateLimitingConfig.errorCode || 429,
        body: rateLimitingConfig.errorResponse || rejectionMessage,
      };
    } else {
      if (trackingList) {
        trackingList.push(trackingInfo);
      } else {
        const newTrackingList = [trackingInfo];
        state.clientTracking.set(remoteAddress, newTrackingList);
      }
    }
  }

  async function handleClientTrackingWithRedisState(
    rateLimitingConfig: RateLimitingConfig,
    stateConfig: RedisStateConfig | undefined
  ) {
    const client = createClient(stateConfig?.options);
    const key = `client_tracking:${remoteAddress}`;
    const jsonEntries = await redisLRange.call(
      client,
      key,
      0,
      rateLimitingConfig.maxRequests + 1
    );
    const trackingList = jsonEntries.map(
      (x) => JSON.parse(x) as ClientTrackingInfo
    );

    const trackingInfo: ClientTrackingInfo = {
      path,
      method,
      time: Date.now(),
    };

    if (mustReject(trackingList || [], rateLimitingConfig)) {
      return {
        status: rateLimitingConfig.errorCode || 429,
        body: rateLimitingConfig.errorResponse || rejectionMessage,
      };
    } else {
      const jsonEntry = JSON.stringify(trackingInfo);
      const multi = client.multi();
      multi
        .lpush(key, jsonEntry)
        .ltrim(key, 0, stateConfig?.clientTrackingListLength || 2000)
        .pexpire(key, stateConfig?.clientTrackingListExpiry || TWO_MINUTES);
      multi.exec();
    }
  }
}

function mustReject(
  trackingInfoList: ClientTrackingInfo[],
  rateLimitingConfig: RateLimitingConfig
) {
  const now = Date.now();

  const requestsMade = trackingInfoList.filter(
    (x) => x.time > now - rateLimitingConfig.duration
  ).length;

  return requestsMade >= rateLimitingConfig.maxRequests;
}
