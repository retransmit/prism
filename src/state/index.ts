import { IApplicationState, RateLimitedRequestInfo } from "../types";

let state: IApplicationState;

const TWO_MINS = 2 * 60 * 1000;

export async function init() {
  // Setup state.
  state = {
    rateLimiting: new Map<string, RateLimitedRequestInfo[]>()
  };
  setInterval(cleanUpRateLimitingEntries, TWO_MINS);
}

function cleanUpRateLimitingEntries() {
  const now = Date.now();
  for (const entry of state.rateLimiting.entries()) {
    if (entry[1].every((x) => now - x.time > TWO_MINS)) {
      state.rateLimiting.delete(entry[0]);
    }
  }
}

export function set(c: IApplicationState) {
  state = c;
}

export function get(): IApplicationState {
  return state;
}
