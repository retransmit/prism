import {
  IAppConfig,
  ClientTrackingInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
  HttpServiceTrackingInfo,
  HttpServiceCircuitBreakerConfig,
  HttpMethods,
} from "../types";
import * as applicationState from "../state";
import {
  HttpRouteConfig,
  FetchedHttpRequestHandlerResponse,
} from "../types/http";
import { WebSocketRouteConfig } from "../types/webSocket";
import error from "../error";
import { createClient, ClientOpts } from "redis";

import { promisify } from "util";

const redisGet = promisify(createClient().get);
const redisSetex = promisify(createClient().setex);

const ONE_MINUTE = 60 * 1000;

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
  const circuitBreakerConfig =
    routeConfig.circuitBreaker || proxyConfig.circuitBreaker;

  if (circuitBreakerConfig) {
    const serviceTrackingList: HttpServiceTrackingInfo[] =
      config.state === undefined || config.state.type === "memory"
        ? await getServiceTrackingInfoFromInMemoryState(route, method)
        : config.state.type === "redis"
        ? await getServiceTrackingInfoFromRedis(
            route,
            method,
            config.state.options
          )
        : error(
            `Unsupported state type ${
              (config.state as any)?.type
            }. Valid values are 'memory' and 'redis'.`
          );

    if (isTripped(circuitBreakerConfig, serviceTrackingList)) {
      return "Busy.";
    }
  }
}

export async function updateCircuitBreakerStats(
  rroute: string,
  method: HttpMethods,
  responses: FetchedHttpRequestHandlerResponse[],
  routeConfig: HttpRouteConfig,
  proxyConfig: HttpProxyConfig,
  config: IAppConfig
) {}

async function getServiceTrackingInfoFromInMemoryState(
  route: string,
  method: HttpMethods
): Promise<HttpServiceTrackingInfo[]> {
  const state = applicationState.get();
  const serviceList = state.httpServiceTracing.get(`${method}_${route}`);
  return serviceList || [];
}

/*
  TODO: We could refactor this to store lists in redis.
        But that is for the next version.
*/

async function getServiceTrackingInfoFromRedis(
  route: string,
  method: HttpMethods,
  options?: ClientOpts
): Promise<HttpServiceTrackingInfo[]> {
  const client = createClient(options);
  const key = `service_tracking:${method}_${route}`;
  const jsonString = await redisGet.call(client, key);
  return jsonString ? JSON.parse(jsonString) : [];
}

async function updateServiceTrackingInfoToInMemoryState(
  route: string,
  method: HttpMethods
) {
  
}

async function updateServiceTrackingInfoToRedis(
  route: string,
  method: HttpMethods
) {

}

function isTripped(
  config: HttpServiceCircuitBreakerConfig,
  serviceTrackingList: HttpServiceTrackingInfo[]
): boolean {
  const aMinuteBack = Date.now() - 60000;

  const errorsPerMin = Math.floor(
    config.errorCount * (60000 / config.duration)
  );

  const recentErrorCount = serviceTrackingList
    .filter((x) => x.responseTime > aMinuteBack)
    .filter(config.isFailure || ((x) => x.statusCode >= 500)).length;

  return recentErrorCount > errorsPerMin;
}
