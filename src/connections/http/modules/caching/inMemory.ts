import { AppConfig } from "../../../../types/config";
import * as applicationState from "../../../../state";
import { HttpResponse } from "../../../../types/http";
import { HttpProxyCacheConfig } from "../../../../types/config/httpProxy/caching";

const ONE_MINUTE = 60 * 1000;

export async function get(
  key: string,
  cacheConfig: HttpProxyCacheConfig,
  config: AppConfig
): Promise<HttpResponse | undefined> {
  const now = Date.now();
  const state = applicationState.get();
  const cachedItem = state.httpResponseCache.get(key);
  if (cachedItem && cachedItem.time > now - cachedItem.expiry) {
    return cachedItem.response;
  }
}

export async function set(
  key: string,
  response: HttpResponse,
  cacheConfig: HttpProxyCacheConfig,
  config: AppConfig
) {
  const state = applicationState.get();
  state.httpResponseCache.set(key, {
    time: Date.now(),
    expiry: cacheConfig.expiry || ONE_MINUTE,
    response,
  });
}
