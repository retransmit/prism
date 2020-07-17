import {
  IApplicationState,
  ClientTrackingInfo,
  HttpServiceTrackingInfo,
  AppConfig,
  InMemoryCacheEntry,
} from "../types";
import { clearInterval } from "timers";

let state: IApplicationState;

const TWO_MINUTES = 2 * 60 * 1000;

const intervals: NodeJS.Timeout[] = [];

export async function init(config: AppConfig) {
  // This function can be called multiple times.
  // Let's start by cleaning up if there's anything.
  for (const interval of intervals) {
    clearInterval(interval);
  }

  // Setup state.
  state = {
    clientTracking: new Map<string, ClientTrackingInfo[]>(),
    httpServiceErrorTracking: new Map<string, HttpServiceTrackingInfo[]>(),
    httpResponseCache: new Map<string, InMemoryCacheEntry>(),
  };

  if (config.state?.type === "memory") {
    const clientTrackingEntryExpiry =
      config.state?.clientTrackingEntryExpiry || TWO_MINUTES;
    const cleanUpClientTrackingEntriesInterval = setInterval(
      () => cleanUpClientTrackingEntries(clientTrackingEntryExpiry, config),
      clientTrackingEntryExpiry
    );
    intervals.push(cleanUpClientTrackingEntriesInterval);

    const httpServiceErrorTrackingListExpiry =
      config.state?.httpServiceErrorTrackingListExpiry || TWO_MINUTES;
    const cleanUpHttpServiceTrackingEntriesInterval = setInterval(
      () =>
        cleanUpHttpServiceTrackingEntries(
          httpServiceErrorTrackingListExpiry,
          config
        ),
      httpServiceErrorTrackingListExpiry
    );
    intervals.push(cleanUpHttpServiceTrackingEntriesInterval);

    const cleanUpCacheEntriesInterval = setInterval(
      () => cleanUpCacheEntries(config),
      TWO_MINUTES
    );
    intervals.push(cleanUpCacheEntriesInterval);
  }
}

function cleanUpClientTrackingEntries(
  clientTrackingEntryExpiry: number,
  config: AppConfig
) {
  const now = Date.now();

  for (const [
    key,
    trackingEntries,
  ] of state.clientTracking.entries()) {
    if (
      trackingEntries.every((x) => now - x.timestamp > clientTrackingEntryExpiry)
    ) {
      state.clientTracking.delete(key);
    } else {
      state.clientTracking.set(
        key,
        trackingEntries.filter((x) => x.timestamp > now - clientTrackingEntryExpiry)
      );
    }
  }
}

function cleanUpHttpServiceTrackingEntries(
  httpServiceErrorTrackingListExpiry: number,
  config: AppConfig
) {
  const now = Date.now();

  for (const [
    routeAndMethod,
    trackingEntries,
  ] of state.httpServiceErrorTracking.entries()) {
    if (
      trackingEntries.every(
        (x) => now - x.responseTime > httpServiceErrorTrackingListExpiry
      )
    ) {
      state.httpServiceErrorTracking.delete(routeAndMethod);
    } else {
      state.httpServiceErrorTracking.set(
        routeAndMethod,
        trackingEntries.filter(
          (x) => x.responseTime > now - httpServiceErrorTrackingListExpiry
        )
      );
    }
  }
}

function cleanUpCacheEntries(config: AppConfig) {
  const now = Date.now();

  for (const [key, entry] of state.httpResponseCache.entries()) {
    if (entry.time > now - entry.expiry) {
      state.httpResponseCache.delete(key);
    }
  }
}

export function set(c: IApplicationState) {
  state = c;
}

export function get(): IApplicationState {
  return state;
}
