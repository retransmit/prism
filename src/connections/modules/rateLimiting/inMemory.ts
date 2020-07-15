import {
  HttpMethods,
  ClientTrackingInfo,
  AppConfig,
} from "../../../types";
import * as applicationState from "../../../state";

export async function getTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  config: AppConfig
): Promise<ClientTrackingInfo[] | undefined> {
  const state = applicationState.get();
  const key = getKey(config.hostId, remoteAddress);
  return state.clientTracking.get(key);
}

export async function setTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  trackingInfo: ClientTrackingInfo,
  config: AppConfig
): Promise<void> {
  const state = applicationState.get();
  const key = getKey(config.hostId, remoteAddress);
  const trackingList = state.clientTracking.get(key);

  if (trackingList) {
    trackingList.push(trackingInfo);
  } else {
    const newTrackingList = [trackingInfo];
    state.clientTracking.set(key, newTrackingList);
  }
}

function getKey(hostId: string, remoteAddress: string) {
  return `${hostId}_${remoteAddress}`;
}
