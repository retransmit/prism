import {
  IApplicationState,
  ClientTrackingInfo,
  HttpServiceTrackingInfo,
  IAppConfig,
} from "../types";

let state: IApplicationState;

const TWO_MINUTES = 2 * 60 * 1000;

export async function init(config: IAppConfig) {
  // Setup state.
  state = {
    clientTracking: new Map<string, ClientTrackingInfo[]>(),
    httpServiceTracing: new Map<string, HttpServiceTrackingInfo[]>(),
  };

  if (config.state?.type === "memory") {
    const clientTrackingEntryExpiry =
      config.state?.clientTrackingEntryExpiry || TWO_MINUTES;
    setInterval(
      () => cleanUpClientTrackingEntries(clientTrackingEntryExpiry, config),
      clientTrackingEntryExpiry
    );
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
        trackingEntries.filter((x) => now - x.time > clientTrackingEntryExpiry)
      );
    }
  }
}

export function set(c: IApplicationState) {
  state = c;
}

export function get(): IApplicationState {
  return state;
}
