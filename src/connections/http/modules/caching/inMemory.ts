import { AppConfig } from "../../../../types";
import * as applicationState from "../../../../state";
import { HttpResponse } from "../../../../types/http";
import { HttpServiceCacheConfig } from "../../../../types/httpServiceCaching";

const ONE_MINUTE = 60 * 1000;

export async function get(
  key: string,
  cacheConfig: HttpServiceCacheConfig,
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
  cacheConfig: HttpServiceCacheConfig,
  config: AppConfig
) {
  const state = applicationState.get();
  state.httpResponseCache.set(key, {
    time: Date.now(),
    expiry: cacheConfig.expiry || ONE_MINUTE,
    response,
  });
}
