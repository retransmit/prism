import {
  IAppConfig,
  RateLimitedRequestInfo,
  HttpProxyConfig,
  WebSocketProxyConfig,
} from "../types";
import * as applicationState from "../state";
import { HttpRouteConfig } from "../types/http";
import { WebSocketRouteConfig } from "../types/webSocket";
import error from "../error";
import { createClient, ClientOpts } from "redis";

import { promisify } from "util";

const redisGet = promisify(createClient().get);
const redisSetex = promisify(createClient().setex);

const ONE_MINUTE = 60 * 1000;

/*
  Rate limiting state is stored in inproc by default,
  but most deployments should use redis.
*/
export default async function applyRateLimiting(
  path: string,
  method: string,
  remoteAddress: string,
  routeConfig: HttpRouteConfig | WebSocketRouteConfig,
  proxyConfig: HttpProxyConfig | WebSocketProxyConfig,
  config: IAppConfig
): Promise<string | undefined> {
  const rateLimitingConfig =
    routeConfig.rateLimiting || proxyConfig.rateLimiting;

  if (rateLimitingConfig) {
    const recentRequests: RateLimitedRequestInfo[] =
      config.state === undefined || config.state.type === "inproc"
        ? await getRecentRequestsDataFromInprocState(
            path,
            method,
            remoteAddress
          )
        : config.state.type === "redis"
        ? await getRecentRequestsDataFromRedis(
            path,
            method,
            remoteAddress,
            config.state.options
          )
        : error(
            `Unsupported state type ${
              (config.state as any)?.type
            }. Valid values are 'inproc' and 'redis'.`
          );

    if (
      exceedsMaxRate(
        rateLimitingConfig.numRequests,
        rateLimitingConfig.duration || ONE_MINUTE,
        recentRequests
      )
    ) {
      return "Too Many Requests.";
    }
  }
}

async function getRecentRequestsDataFromInprocState(
  path: string,
  method: string,
  remoteAddress: string
): Promise<RateLimitedRequestInfo[]> {
  const state = applicationState.get();
  const newRequest = {
    path,
    method,
    time: Date.now(),
  };

  const requestList = state.rateLimiting.get(remoteAddress);

  if (requestList === undefined) {
    const newRequestList = [newRequest];
    state.rateLimiting.set(remoteAddress, newRequestList);
    return newRequestList;
  } else {
    requestList.push(newRequest);
    return requestList;
  }
}

/*
  TODO: We could refactor this to store lists in redis.
        But that is for the next version.
*/

async function getRecentRequestsDataFromRedis(
  path: string,
  method: string,
  remoteAddress: string,
  options?: ClientOpts
): Promise<RateLimitedRequestInfo[]> {
  const client = createClient(options);
  const key = `rate_limiting:${remoteAddress}`;
  const jsonString = await redisGet.call(client, key);
  const newRequest = {
    path,
    method,
    time: Date.now(),
  };
  if (jsonString) {
    const requestList = JSON.parse(jsonString) as RateLimitedRequestInfo[];
    requestList.push(newRequest);
    redisSetex.call(client, key, 60, JSON.stringify(requestList));
    return requestList;
  } else {
    const requestList = [newRequest];
    redisSetex.call(client, key, 60, JSON.stringify(requestList));
    return requestList;
  }
}

function exceedsMaxRate(
  numRequests: number,
  duration: number,
  requestList: RateLimitedRequestInfo[]
) {
  const rpm = Math.floor(numRequests * (60000 / duration));
  const aMinuteBack = Date.now() - 60000;
  return requestList.filter((x) => x.time > aMinuteBack).length > rpm;
}
