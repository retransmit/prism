#!/usr/bin/env node

import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import yargs = require("yargs");
import ws = require("ws");
import url = require("url");
import { IncomingMessage } from "http";
import { createServer } from "http";
import { ServerResponse } from "http";

import * as configModule from "./config";
import { IAppConfig } from "./types";

import createHttpRequestHandler from "./requestHandlers/http/handler";
import createWebSocketRequestHandler, {
  init as wsInit,
  upgrade as wsUpgrade,
} from "./requestHandlers/websocket/handler";
import { init as redisInit } from "./lib/redis/clients";
import httpRedisServiceInit from "./requestHandlers/http/backends/redis/init";
import websocketRedisServiceInit from "./requestHandlers/http/backends/redis/init";
import { init as activeRedisRequestsInit } from "./requestHandlers/http/backends/redis/activeRequests";
import { init as activeConnectionsInit } from "./requestHandlers/websocket/activeConnections";

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
  instanceId: string,
  configFile: string
) {
  const appConfig: IAppConfig = require(configFile);
  return await startWithConfiguration(port, instanceId, appConfig);
}

export async function startWithConfiguration(
  port: number | undefined,
  instanceId: string,
  appConfig: IAppConfig
) {
  if (!appConfig.instanceId) {
    appConfig.instanceId = instanceId;
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
  koaApp.use(bodyParser());
  koaApp.use(router.routes());
  koaApp.use(router.allowedMethods());
  const koaRequestHandler = koaApp.callback();

  function httpRequestHandler(req: IncomingMessage, res: ServerResponse) {
    koaRequestHandler(req, res);
  }

  const httpServer = createServer(httpRequestHandler);

  if (config.websockets) {
    wsInit();
    httpServer.on("upgrade", wsUpgrade);
  }

  if (port) {
    httpServer.listen(port);
  } else {
    httpServer.listen();
  }

  return httpServer;
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
    const instanceId = argv.i || random(16);

    startApp(port, instanceId, configDir);
    console.log(`listening on port ${port}`);
  }
}
