import {
  IApplicationState,
  ClientTrackingInfo,
  HttpServiceErrorTrackingInfo,
  IAppConfig,
  HttpResponse,
  InMemoryCacheEntry,
} from "../types";

let state: IApplicationState;

const TWO_MINUTES = 2 * 60 * 1000;

export async function init(config: IAppConfig) {
  // Setup state.
  state = {
    clientTracking: new Map<string, ClientTrackingInfo[]>(),
    httpServiceErrorTracking: new Map<string, HttpServiceErrorTrackingInfo[]>(),
    httpResponseCache: new Map<string, InMemoryCacheEntry>(),
  };

  if (config.state?.type === "memory") {
    const clientTrackingEntryExpiry =
      config.state?.clientTrackingEntryExpiry || TWO_MINUTES;
    setInterval(
      () => cleanUpClientTrackingEntries(clientTrackingEntryExpiry, config),
      clientTrackingEntryExpiry
    );

    const httpServiceErrorTrackingListExpiry =
      config.state?.httpServiceErrorTrackingListExpiry || TWO_MINUTES;
    setInterval(
      () =>
        cleanUpHttpServiceTrackingEntries(
          httpServiceErrorTrackingListExpiry,
          config
        ),
      httpServiceErrorTrackingListExpiry
    );

    setInterval(() => cleanUpCacheEntries(config), TWO_MINUTES);
  }
}

function cleanUpClientTrackingEntries(
  clientTrackingEntryExpiry: number,
  config: IAppConfig
) {
  const now = Date.now();

  for (const [
    remoteAddress,
    trackingEntries,
  ] of state.clientTracking.entries()) {
    if (
      trackingEntries.every((x) => now - x.time > clientTrackingEntryExpiry)
    ) {
      state.clientTracking.delete(remoteAddress);
    } else {
      state.clientTracking.set(
        remoteAddress,
        trackingEntries.filter((x) => x.time > now - clientTrackingEntryExpiry)
      );
    }
  }
}

function cleanUpHttpServiceTrackingEntries(
  httpServiceErrorTrackingListExpiry: number,
  config: IAppConfig
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

function cleanUpCacheEntries(config: IAppConfig) {
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
