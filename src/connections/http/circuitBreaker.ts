import {
  IAppConfig,
  HttpProxyConfig,
  HttpMethods,
  InMemoryStateConfig,
  RedisStateConfig,
  HttpServiceErrorTrackingInfo,
  HttpServiceCircuitBreakerConfig,
} from "../../types";
import * as applicationState from "../../state";
import { HttpRouteConfig } from "../../types/http";
import error from "../../error";
import { createClient } from "redis";

import { promisify } from "util";

const redisLRange = promisify(createClient().lrange);
const redisLPush: (key: string, val: string) => Promise<void> = promisify(
  createClient().lpush
) as any;
const redisLTrim = promisify(createClient().ltrim);
const redisPExpire = promisify(createClient().pexpire);

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

/*
  Rate limiting state is stored in memory by default,
  but most deployments should use redis.
*/
export async function applyCircuitBreaker(
  route: string,
  method: HttpMethods,
  routeConfig: HttpRouteConfig,
  proxyConfig: HttpProxyConfig,
  config: IAppConfig
): Promise<string | undefined> {
  const rejectionMessage = "Busy.";
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || proxyConfig.circuitBreaker;

  if (circuitBreakerConfig) {
    return config.state === undefined || config.state.type === "memory"
      ? await handleServiceTrackingWithInMemoryState(
          circuitBreakerConfig,
          config.state
        )
      : config.state.type === "redis"
      ? handleServiceTrackingWithRedisState(circuitBreakerConfig, config.state)
      : error(
          `Unsupported state type ${
            (config.state as any)?.type
          }. Valid values are 'memory' and 'redis'.`
        );
  }

  async function handleServiceTrackingWithInMemoryState(
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: InMemoryStateConfig | undefined
  ) {
    const key = `${route}:${method}`;
    const state = applicationState.get();
    const trackingList = state.httpServiceErrorTracking.get(key);

    if (mustReject(trackingList || [], circuitBreakerConfig)) {
      return rejectionMessage;
    }
  }

  async function handleServiceTrackingWithRedisState(
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: RedisStateConfig | undefined
  ) {
    const client = createClient(stateConfig?.options);
    const key = `http_service_error_tracking:${route}:${method}`;

    const jsonEntries = await redisLRange.call(client, key, 0, -1);

    const trackingList = jsonEntries.map(
      (x) => JSON.parse(x) as HttpServiceErrorTrackingInfo
    );

    if (mustReject(trackingList || [], circuitBreakerConfig)) {
      return rejectionMessage;
    }
  }
}

export async function updateHttpServiceErrorTracking(
  route: string,
  method: HttpMethods,
  status: number | undefined,
  requestTime: number,
  responseTime: number,
  routeConfig: HttpRouteConfig,
  proxyConfig: HttpProxyConfig,
  config: IAppConfig
) {
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || proxyConfig.circuitBreaker;

  const trackingInfo: HttpServiceErrorTrackingInfo = {
    route,
    method,
    status,
    requestTime,
    responseTime,
  };

  if (circuitBreakerConfig) {
    const isFailure =
      (circuitBreakerConfig.isFailure &&
        circuitBreakerConfig.isFailure(trackingInfo)) ||
      (trackingInfo.status && trackingInfo.status >= 500);

    if (isFailure) {
      if (config.state === undefined || config.state.type === "memory") {
        await updateHttpServiceErrorTrackingInMemory(
          trackingInfo,
          circuitBreakerConfig,
          config.state
        );
      } else if (config.state.type === "redis") {
        await updateHttpServiceErrorTrackingInRedis(
          trackingInfo,
          circuitBreakerConfig,
          config.state
        );
      }
    }
  }

  async function updateHttpServiceErrorTrackingInMemory(
    trackingInfo: HttpServiceErrorTrackingInfo,
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: InMemoryStateConfig | undefined
  ) {
    const key = `${route}:${method}`;
    const state = applicationState.get();
    const trackingList = state.httpServiceErrorTracking.get(key);

    if (trackingList) {
      trackingList.push(trackingInfo);
    } else {
      const newTrackingList = [trackingInfo];
      state.httpServiceErrorTracking.set(key, newTrackingList);
    }
  }

  async function updateHttpServiceErrorTrackingInRedis(
    trackingInfo: HttpServiceErrorTrackingInfo,
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: RedisStateConfig | undefined
  ) {
    const client = createClient(stateConfig?.options);
    const key = `http_service_error_tracking:${route}:${method}`;

    const jsonEntry = JSON.stringify(trackingInfo);
    await redisLPush.call(client, key, jsonEntry);
    await redisLTrim.call(
      client,
      key,
      0,
      stateConfig?.httpServiceErrorTrackingListLength || 2000
    );
    await redisPExpire.call(
      client,
      key,
      stateConfig?.httpServiceErrorTrackingListExpiry || TWO_MINUTES
    );
  }
}

function mustReject(
  trackingInfoList: HttpServiceErrorTrackingInfo[],
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig
) {
  const now = Date.now();
  let errorCount = 0;

  for (const info of trackingInfoList) {
    if (info.responseTime > now - circuitBreakerConfig.duration) {
      errorCount++;
    }
    if (errorCount >= circuitBreakerConfig.maxErrors) {
      return true;
    }
  }
  return false;
}
