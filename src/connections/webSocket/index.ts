import { AppConfig, WebSocketProxyAppConfig } from "../../types";
import WebSocket from "ws";
import createHandler from "./createHandler";
import { IncomingMessage } from "http";
import { Socket } from "net";
import * as activeConnections from "./activeConnections";
import { isWebSocketProxyConfig } from "./isWebSocketProxyConfig";
import plugins from "./plugins";

let webSocketServer: WebSocket.Server | undefined = undefined;

export async function init(config: WebSocketProxyAppConfig) {
  const webSocketServers: {
    [key: string]: WebSocket.Server;
  } = {};

  // Load other plugins
  if (config.webSocket.plugins) {
    for (const pluginName of Object.keys(config.webSocket.plugins)) {
      plugins[pluginName] = require(config.webSocket.plugins[pluginName].path);
    }
  }

  // Call init on all the plugins.
  for (const pluginName of Object.keys(plugins)) {
    await plugins[pluginName].init(config);
  }

  activeConnections.init();
}

export async function setupRequestHandling(
  httpServer: any, // TODO
  config: WebSocketProxyAppConfig
) {
  const wss = new WebSocket.Server({ noServer: true });
  webSocketServer = wss;

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws: any) {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(function noop() {});
    });
  }, 30000);

  wss.on("close", function close() {
    clearInterval(interval);
  });

  httpServer.on("upgrade", makeUpgrade(wss));

  wss.on("connection", createHandler(config));
  return wss;
}

function makeUpgrade(webSocketServer: WebSocket.Server) {
  return function upgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    if (request.url) {
      if (webSocketServer) {
        webSocketServer.handleUpgrade(request, socket, head, function done(ws) {
          webSocketServer.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  };
}
