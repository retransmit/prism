import * as applicationState from "../../../state";

import {
  HttpServiceErrorTrackingInfo,
  HttpServiceCircuitBreakerConfig,
  InMemoryStateConfig,
  HttpMethods,
} from "../../../types";

export async function getTrackingInfo(
  route: string,
  method: HttpMethods,
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
  stateConfig: InMemoryStateConfig | undefined
): Promise<HttpServiceErrorTrackingInfo[] | undefined> {
  const key = `${route}:${method}`;
  const state = applicationState.get();
  return state.httpServiceErrorTracking.get(key);
}

export async function setTrackingInfo(
  route: string,
  method: HttpMethods,
  trackingInfo: HttpServiceErrorTrackingInfo,
  circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
  stateConfig: InMemoryStateConfig | undefined
): Promise<void> {
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
