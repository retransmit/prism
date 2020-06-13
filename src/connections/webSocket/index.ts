import { IAppConfig, WebSocketProxyConfig } from "../../types";
import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";
import {
  IWebSocketRequestHandlerPlugin,
  WebSocketRouteConfig,
} from "../../types/webSocket";
import WebSocket from "ws";
import makeHandler from "./handler";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { init as activeConnectionsInit } from "./activeConnections";

const plugins: {
  [name: string]: IWebSocketRequestHandlerPlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
    connect: httpPlugin.connect,
    disconnect: httpPlugin.disconnect,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
    connect: redisPlugin.connect,
    disconnect: redisPlugin.disconnect,
  },
};

export default async function init(
  httpServer: any, // TODO
  config: IAppConfig
) {
  const webSocketServers: {
    [key: string]: WebSocket.Server;
  } = {};

  if (config.webSocket) {
    httpServer.on("upgrade", makeUpgrade(webSocketServers));

    // Load other plugins
    if (config.webSocket.plugins) {
      for (const pluginName of Object.keys(config.webSocket.plugins)) {
        plugins[pluginName] = require(config.webSocket.plugins[pluginName].path);
      }
    }

    for (const pluginName of Object.keys(plugins)) {
      await plugins[pluginName].init(config);
    }

    for (const route of Object.keys(config.webSocket.routes)) {
      const routeConfig = config.webSocket.routes[route];
      const wss = new WebSocket.Server({ noServer: true });
      webSocketServers[route] = wss;
      setupWebSocketHandling(wss, route, routeConfig, config.webSocket);
    }

    activeConnectionsInit();
  }

  return Object.keys(webSocketServers).reduce(
    (acc, route) => acc.concat(webSocketServers[route]),
    [] as WebSocket.Server[]
  );
}

function setupWebSocketHandling(
  wss: WebSocket.Server,
  route: string,
  routeConfig: WebSocketRouteConfig,
  webSocketConfig: WebSocketProxyConfig
) {
  const handler = makeHandler(plugins);
  wss.on("connection", handler(route, routeConfig, webSocketConfig));

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
}

function makeUpgrade(webSocketServers: { [key: string]: WebSocket.Server }) {
  return function upgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    if (request.url) {
      const server = webSocketServers[request.url];
      if (server) {
        server.handleUpgrade(request, socket, head, function done(ws) {
          server.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  };
}
