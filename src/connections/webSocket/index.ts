import { AppConfig } from "../../types";
import WebSocket from "ws";
import * as activeConnections from "./activeConnections";
import { isWebSocketProxyConfig } from "./isWebSocketProxyConfig";
import plugins from "./plugins";
import { IncomingMessage } from "http";
import createHandler from "./createHandler";

let currentRequestHandler:
  | ((ws: WebSocket, request: IncomingMessage) => void)
  | undefined = undefined;

export async function init(config: AppConfig) {
  if (isWebSocketProxyConfig(config)) {
    // Load other plugins
    if (config.webSocket.plugins) {
      for (const pluginName of Object.keys(config.webSocket.plugins)) {
        plugins[pluginName] = require(config.webSocket.plugins[pluginName]
          .path);
      }
    }

    // Call init on all the plugins.
    for (const pluginName of Object.keys(plugins)) {
      await plugins[pluginName].init(config);
    }
  }

  activeConnections.init();

  currentRequestHandler = createHandler(config);
}

export function requestHandler(ws: WebSocket, req: IncomingMessage) {
  if (currentRequestHandler) {
    currentRequestHandler(ws, req);
  }
}
