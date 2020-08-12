import { ActiveWebSocketConnection } from "../../types/webSocket";

let map: Map<string, ActiveWebSocketConnection> = new Map<
  string,
  ActiveWebSocketConnection
>();
let initted = false;

export function init() {
  if (!initted) {
    initted = true;
    map = new Map<string, ActiveWebSocketConnection>();
  }
}

export function clear() {
  initted = false;
  map = new Map<string, ActiveWebSocketConnection>();
}

export function get() {
  if (!initted) {
    throw new Error(
      "activeConnections was not initted. Call init during application start."
    );
  } else {
    return map;
  }
}
