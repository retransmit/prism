#!/usr/bin/env node

import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import yargs = require("yargs");
const cors = require("@koa/cors");

import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import { createServer as httpCreateServer } from "http";
import { Server as HttpServer } from "http";
import { createServer as httpsCreateServer } from "https";
import { Server as HttpsServer } from "https";

import WebSocket from "ws";

import * as configModule from "./config";
import { IAppConfig } from "./types";

import createHttpRequestHandler from "./clients/http/handler";
import {
  init as wsInit,
  upgrade as wsUpgrade,
} from "./clients/webSocket/handler";
import { init as redisInit } from "./lib/redis/clients";
import httpRedisServiceInit from "./clients/http/plugins/redis/init";
import websocketRedisServiceInit from "./clients/webSocket/plugins/redis/init";
import { init as activeRedisRequestsInit } from "./clients/http/plugins/redis/activeRequests";
import { init as activeConnectionsInit } from "./clients/webSocket/activeConnections";

import { Server } from "http";
import { readFileSync } from "fs";
import random from "./lib/random";

const packageJson = require("../package.json");

const argv = yargs.options({
  c: { type: "string", alias: "config" },
  i: { type: "string", alias: "instance" },
  p: { type: "number", default: 8080, alias: "port" },
  v: { type: "boolean", alias: "version" },
}).argv;

export async function startApp(
  port: number,
  instanceId: string | undefined,
  configFile: string
) {
  const appConfig: IAppConfig = require(configFile);
  return await startWithConfiguration(port, instanceId, appConfig);
}

export async function startWithConfiguration(
  port: number | undefined,
  instanceId: string | undefined,
  appConfig: IAppConfig
): Promise<{
  httpServer: Server;
  websocketServers: WebSocket.Server[];
  instanceId: string;
}> {
  if (instanceId) {
    appConfig.instanceId = instanceId;
  }

  if (!appConfig.instanceId || appConfig.instanceId.trim() === "") {
    appConfig.instanceId = random();
  }

  // People are going to mistype 'webSocket' as all lowercase.
  if ((appConfig as any).websocket !== undefined) {
    appConfig.webSocket = (appConfig as any).websocket;
    (appConfig as any).websocket = undefined;
  }

  // Set up the config
  configModule.set(appConfig);

  // Init redis
  redisInit();
  activeRedisRequestsInit();
  activeConnectionsInit();

  await httpRedisServiceInit();
  await websocketRedisServiceInit();

  // Set up routes
  const router = new Router();

  const config = configModule.get();

  if (config.http) {
    for (const route of Object.keys(config.http.routes)) {
      const routeConfig = config.http.routes[route];

      if (routeConfig["GET"]) {
        router.get(route, createHttpRequestHandler("GET"));
      }

      if (routeConfig["POST"]) {
        router.post(route, createHttpRequestHandler("POST"));
      }

      if (routeConfig["PUT"]) {
        router.put(route, createHttpRequestHandler("PUT"));
      }

      if (routeConfig["DELETE"]) {
        router.del(route, createHttpRequestHandler("DELETE"));
      }

      if (routeConfig["PATCH"]) {
        router.patch(route, createHttpRequestHandler("PATCH"));
      }
    }
  }

  // Start app
  const koaApp = new Koa();
  if (config.cors) {
    koaApp.use(cors(config.cors));
  }
  koaApp.use(bodyParser());
  koaApp.use(router.routes());
  koaApp.use(router.allowedMethods());
  const koaRequestHandler = koaApp.callback();

  function httpRequestHandler(req: IncomingMessage, res: ServerResponse) {
    koaRequestHandler(req, res);
  }

  let httpServer: HttpServer | HttpsServer;
  if (config.useHttps) {
    const options = {
      key: readFileSync(config.useHttps.key),
      cert: readFileSync(config.useHttps.cert),
    };
    httpServer = httpsCreateServer(options, httpRequestHandler);
  } else {
    httpServer = httpCreateServer(httpRequestHandler);
  }

  let websocketServers: WebSocket.Server[] = [];

  if (config.webSocket) {
    websocketServers = wsInit();
    httpServer.on("upgrade", wsUpgrade);
  }

  if (port) {
    httpServer.listen(port);
  } else {
    httpServer.listen();
  }

  httpServer.on("close", () => {
    for (const server of websocketServers) {
      server.close();
    }
  });

  return {
    httpServer,
    websocketServers,
    instanceId: appConfig.instanceId,
  };
}

if (require.main === module) {
  // Print the version and exit
  if (argv.v) {
    console.log(packageJson.version);
  } else {
    if (!argv.p) {
      console.log("The port should be specified with the -p option.");
      process.exit(1);
    }

    if (!argv.c) {
      console.log(
        "The configuration file should be specified with the -c option."
      );
      process.exit(1);
    }

    const configDir = argv.c;
    const port = argv.p;
    const instanceId = argv.i;

    startApp(port, instanceId, configDir).then((config) => {
      console.log(
        `retransmit instance ${config.instanceId} listening on port ${port}`
      );
    });
  }
}
