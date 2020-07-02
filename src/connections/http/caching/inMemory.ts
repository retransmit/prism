import {
  HttpServiceCacheConfig,
  HttpResponse,
  InMemoryStateConfig,
} from "../../../types";
import * as applicationState from "../../../state";

const ONE_MINUTE = 60 * 1000;

export async function get(
  key: string,
  stateConfig: InMemoryStateConfig
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
  stateConfig: InMemoryStateConfig,
  cacheConfig: HttpServiceCacheConfig
) {
  const state = applicationState.get();
  state.httpResponseCache.set(key, {
    time: Date.now(),
    expiry: cacheConfig.expiry || ONE_MINUTE,
    response,
  });
}
