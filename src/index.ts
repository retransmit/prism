#!/usr/bin/env node
import yargs = require("yargs");

import { createServer as httpCreateServer } from "http";
import { Server as HttpServer } from "http";
import { createServer as httpsCreateServer } from "https";
import { Server as HttpsServer } from "https";

import WebSocket from "ws";

import * as configModule from "./config";
import { IAppConfig } from "./types";

import initHttpRequestHandling from "./connections/http/handler";
import initWebSocketRequestHandling from "./connections/webSocket";

import { Server } from "http";
import { readFileSync } from "fs";
import random from "./lib/random";

const packageJson = require("../package.json");

const argv = yargs.options({
  c: { type: "string", alias: "config" },
  i: { type: "string", alias: "instance" },
  p: { type: "number", default: 8080, alias: "port" },
  v: { type: "boolean", alias: "version" }
}).argv;

export async function startApp(
  port: number,
  instanceId: string | undefined,
  configFile: string
) {
  const config: IAppConfig = require(configFile);
  return await startWithConfiguration(port, instanceId, config);
}

export async function startWithConfiguration(
  port: number | undefined,
  instanceId: string | undefined,
  config: IAppConfig
): Promise<{
  httpServer: Server;
  webSocketServers: WebSocket.Server[];
  instanceId: string;
}> {
  if (instanceId) {
    config.instanceId = instanceId;
  }

  if (!config.instanceId || config.instanceId.trim() === "") {
    config.instanceId = random();
  }

  // People are going to mistype 'webSocket' as all lowercase.
  if ((config as any).websocket !== undefined) {
    config.webSocket = (config as any).websocket;
    (config as any).websocket = undefined;
  }

  // Set up the config
  configModule.set(config);

  // Get routes to handle
  const httpRequestHandler = await initHttpRequestHandling(config);

  // Create the HttpServer
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

  let webSocketServers: WebSocket.Server[] = [];

  // Attach webSocket servers
  webSocketServers = await initWebSocketRequestHandling(httpServer, config);

  if (port) {
    httpServer.listen(port);
  } else {
    httpServer.listen();
  }

  httpServer.on("close", () => {
    for (const server of webSocketServers) {
      server.close();
    }
  });

  return {
    httpServer,
    webSocketServers: webSocketServers,
    instanceId: config.instanceId,
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
        `retransmit instance '${config.instanceId}' listening on port ${port}`
      );
    });
  }
}
