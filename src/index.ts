#!/usr/bin/env node
import WebSocket from "ws";
import cluster from "cluster";
import os from "os";
import yargs = require("yargs");

import * as configModule from "./config";

import { AppConfig, UserAppConfig, AppControl } from "./types";
import * as applicationState from "./state";
import createHttpServer from "./connections/http/createServer";
import * as httpConnections from "./connections/http";

import * as webSocketConnections from "./connections/webSocket";
import createWebSocketServer from "./connections/webSocket/createServer";

import * as webJobs from "./webJobs";

import { closeHttpServer } from "./utils/http/closeHttpServer";
import { closeWebSocketServer } from "./utils/webSocket/closeWebSocketServer";
import namesGenerator from "./utils/namesGenerator";
import { isWebSocketProxyConfig } from "./connections/webSocket/isWebSocketProxyConfig";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

const packageJson = require("../package.json");

export type WorkerStartArgs = {
  instanceId: string;
};

export async function startApp(
  port: number,
  instanceId: string | undefined,
  configFile: string,
  useCluster: boolean,
  silent: boolean,
  workers: number | undefined
) {
  const config: UserAppConfig = require(configFile);
  config.numWorkers = workers ?? config.numWorkers ?? os.cpus().length;
  config.silent = silent;

  const generatedName = namesGenerator("_");
  let counter = 0;

  if (useCluster) {
    if (cluster.isMaster) {
      const effectiveInstanceId =
        instanceId || config.instanceId || generatedName;
      if (!config.silent) {
        console.log(
          `cluster ${effectiveInstanceId} with ${config.numWorkers} workers, master pid = ${process.pid}.`
        );
      }
      function startWorker(counter: number) {
        const worker = cluster.fork();
        worker.send({
          type: "start",
          instanceId: `${effectiveInstanceId}_${counter}`,
        });
      }

      // Fork workers.
      for (let i = 0; i < config.numWorkers; i++) {
        counter++;
        startWorker(counter);
      }

      cluster.on("exit", (worker, code, signal) => {
        startWorker(counter);
      });
    } else {
      return startWithConfiguration(port, config, "doesnt_matter", {
        isCluster: true,
      });
    }
  } else {
    return startWithConfiguration(port, config, generatedName, {
      isCluster: false,
    });
  }
}

export type StartOpts = {
  isCluster: boolean;
};

export async function startWithConfiguration(
  port: number,
  userAppConfig: UserAppConfig,
  workerInstanceId: string,
  opts: StartOpts
): Promise<AppControl> {
  const config: AppConfig = userAppConfig as any;

  const instanceId: string = opts.isCluster
    ? await new Promise((success) => {
        process.on("message", (data) => {
          if (data.type === "start") success(data.instanceId);
        });
      })
    : workerInstanceId;

  // Append a counter to the instanceId to make it unique.
  // We need this so that workers don't fetch from the same redis queues.
  config.instanceId = instanceId;

  await mutateAndCleanupConfig(config);
  configModule.set(config);

  // Create the http server.
  const httpServer = createHttpServer(config);
  let webSocketServer: WebSocket.Server | undefined;

  // Init the websocket server only if websockets are defined.
  // This also means that you cannot dynamically add a websocket route.
  // But if a route is already defined, you could change one or more of them.
  if (isWebSocketProxyConfig(config)) {
    webSocketServer = createWebSocketServer(httpServer, config);
  }

  // This sets up request handlers for the servers.
  await initModules(config);

  httpServer.listen(port);

  async function closeServers() {
    if (webSocketServer) {
      await closeWebSocketServer(webSocketServer);
    }
    await closeHttpServer(httpServer);
  }

  if (!config.silent) {
    console.log(
      `instance ${config.instanceId} listening on port ${port}, pid = ${process.pid}.`
    );
  }

  return {
    instanceId: config.instanceId,
    port,
    closeServers,
  };
}

if (require.main === module) {
  const argv = yargs.options({
    c: { type: "string", alias: "config" },
    i: { type: "string", alias: "instance" },
    p: { type: "number", default: 8080, alias: "port" },
    v: { type: "boolean", alias: "version" },
    silent: { type: "boolean" },
    cluster: { type: "boolean" },
    workers: { type: "number" },
  }).argv;

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

    startApp(
      port,
      instanceId,
      configFile,
      argv.cluster ?? false,
      argv.silent ?? false,
      argv.workers
    );
  }
}

export async function mutateAndCleanupConfig(config: AppConfig) {
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

  config.silent = config.silent ?? false;
}

export async function initModules(config: AppConfig) {
  await applicationState.init(config);
  await webJobs.init(config);
  await httpConnections.init(config);
  if (isWebSocketProxyConfig(config)) {
    await webSocketConnections.init(config);
  }
}
