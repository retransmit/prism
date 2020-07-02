import {
  HttpMethods,
  RateLimitingConfig,
  RedisStateConfig,
  ClientTrackingInfo,
} from "../../../types";
import * as applicationState from "../../../state";

export async function getTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  rateLimitingConfig: RateLimitingConfig,
  stateConfig: RedisStateConfig | undefined
): Promise<ClientTrackingInfo[] | undefined> {
  const state = applicationState.get();
  return state.clientTracking.get(remoteAddress);
}

export async function setTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  trackingInfo: ClientTrackingInfo,
  rateLimitingConfig: RateLimitingConfig,
  stateConfig: RedisStateConfig | undefined
): Promise<void> {
  const state = applicationState.get();
  const trackingList = state.clientTracking.get(remoteAddress);

  if (trackingList) {
    trackingList.push(trackingInfo);
  } else {
    const newTrackingList = [trackingInfo];
    state.clientTracking.set(remoteAddress, newTrackingList);
  }
}
