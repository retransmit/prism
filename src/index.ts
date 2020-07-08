#!/usr/bin/env node

import { createServer as httpCreateServer } from "http";
import { Server as HttpServer } from "http";
import { createServer as httpsCreateServer } from "https";
import { Server as HttpsServer } from "https";
import WebSocket from "ws";
import cluster from "cluster";
import os from "os";
import yargs = require("yargs");

import { AppConfig, UserAppConfig } from "./types";
import * as applicationState from "./state";
import initWebSocketHandling from "./connections/webSocket";
import random from "./utils/random";
import * as webJobs from "./connections/http/webJobs";
import initHttpHandling from "./connections/http";

import { closeHttpServer } from "./utils/http/closeHttpServer";
import { closeWebSocketServer } from "./utils/webSocket/closeWebSocketServer";
import namesGenerator from "./utils/namesGenerator";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

const packageJson = require("../package.json");

const argv = yargs.options({
  c: { type: "string", alias: "config" },
  i: { type: "string", alias: "instance" },
  p: { type: "number", default: 8080, alias: "port" },
  v: { type: "boolean", alias: "version" },
  silent: { type: "boolean" },
}).argv;

export type AppControl = {
  instanceId: string;
  port: number;
  closeServers: () => Promise<void>;
};

export async function startApp(
  port: number,
  instanceId: string | undefined,
  configFile: string,
  silent: boolean
) {
  const config: UserAppConfig = require(configFile);
  config.numWorkers = config.numWorkers || os.cpus().length;

  if (cluster.isMaster) {
    // Fork workers.
    for (let i = 0; i < config.numWorkers; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {});
  } else {
    return startWithConfiguration(port, instanceId, config, { silent });
  }
}

export type StartOpts = {
  silent: boolean;
};

export async function startWithConfiguration(
  port: number,
  instanceId: string | undefined,
  userAppConfig: UserAppConfig,
  opts: StartOpts
): Promise<AppControl> {
  const config: AppConfig = userAppConfig as any;
  if (instanceId) {
    config.instanceId = `${instanceId}_${random()}`;
  } else if (config.instanceId) {
    config.instanceId = `${config.instanceId}_${random()}`;
  } else {
    config.instanceId = `${namesGenerator("_")}_${random()}`;
  }

  // People are going to mistype 'webSocket' as all lowercase.
  if ((config as any).websocket !== undefined) {
    if (config.webSocket !== undefined) {
      console.log(
        "Both config.websocket and config.webSocket are specified. 'webSocket' is the correct property to use."
      );
      process.exit(1);
    }
    config.webSocket = (config as any).websocket;
    (config as any).websocket = undefined;
  }

  // People are going to mistype 'webjobs' as all lowercase.
  if ((config as any).webjobs !== undefined) {
    if (config.webJobs !== undefined) {
      console.log(
        "Both config.webjobs and config.webJobs are specified. 'webJobs' is the correct property to use."
      );
      process.exit(1);
    }
    config.webJobs = (config as any).webjobs;
    (config as any).webjobs = undefined;
  }

  // Initialize state
  if (!config.state) {
    config.state = {
      type: "memory",
      clientTrackingEntryExpiry: TWO_MINUTES,
      httpServiceErrorTrackingListExpiry: TWO_MINUTES,
    };
  }
  await applicationState.init(config);

  // Schedule web jobs
  webJobs.init(config);

  // Get routes to handle
  const httpRequestHandler = await initHttpHandling(config);
  // Create the HttpServer
  let httpServer: HttpServer | HttpsServer;
  if (config.useHttps) {
    const options = {
      key: config.useHttps.key,
      cert: config.useHttps.cert,
    };
    httpServer = (config.createHttpsServer || httpsCreateServer)(
      options,
      httpRequestHandler
    );
  } else {
    httpServer = (config.createHttpServer || httpCreateServer)(
      httpRequestHandler
    );
  }

  let webSocketServers: WebSocket.Server[] = [];

  // Attach webSocket servers
  webSocketServers = await initWebSocketHandling(httpServer, config);

  httpServer.listen(port);

  httpServer.on("close", () => {
    for (const server of webSocketServers) {
      server.close();
    }
  });

  async function closeServers() {
    for (const webSocketServer of webSocketServers) {
      await closeWebSocketServer(webSocketServer);
    }
    await closeHttpServer(httpServer);
  }

  if (!opts.silent) {
    console.log(
      `retransmit instance ${config.instanceId} listening on port ${port}`
    );
  }

  return {
    instanceId: config.instanceId,
    port,
    closeServers: closeServers,
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

    const configFile = argv.c;
    const port = argv.p;
    const instanceId = argv.i;

    startApp(port, instanceId, configFile, argv.silent ?? false);
  }
}
