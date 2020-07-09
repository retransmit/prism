#!/usr/bin/env node

import { createServer as httpCreateServer } from "http";
import { Server as HttpServer } from "http";
import { createServer as httpsCreateServer } from "https";
import { Server as HttpsServer } from "https";
import WebSocket from "ws";
import cluster from "cluster";
import os from "os";
import yargs = require("yargs");

import {
  AppConfig,
  UserAppConfig,
  HttpProxyAppConfig,
  WebSocketProxyAppConfig,
} from "./types";
import * as applicationState from "./state";
import * as webSocketConnections from "./connections/webSocket";
import * as httpConnections from "./connections/http";
import * as webJobs from "./connections/http/webJobs";

import { closeHttpServer } from "./utils/http/closeHttpServer";
import { closeWebSocketServer } from "./utils/webSocket/closeWebSocketServer";
import namesGenerator from "./utils/namesGenerator";
import { isWebSocketProxyConfig } from "./connections/webSocket/isWebSocketProxyConfig";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

const packageJson = require("../package.json");

const argv = yargs.options({
  c: { type: "string", alias: "config" },
  i: { type: "string", alias: "instance" },
  p: { type: "number", default: 8080, alias: "port" },
  v: { type: "boolean", alias: "version" },
  silent: { type: "boolean" },
  nocluster: { type: "boolean" },
  workers: { type: "number" },
}).argv;

export type AppControl = {
  instanceId: string;
  port: number;
  closeServers: () => Promise<void>;
};

export type WorkerStartArgs = {
  instanceId: string;
};

export async function startApp(
  port: number,
  instanceId: string | undefined,
  configFile: string,
  notCluster: boolean,
  silent: boolean,
  workers: number | undefined
) {
  const config: UserAppConfig = require(configFile);
  config.numWorkers = workers ?? config.numWorkers ?? os.cpus().length;

  const generatedName = namesGenerator("_");
  let counter = 0;

  if (notCluster) {
    return startWithConfiguration(port, config, generatedName, {
      isCluster: false,
      silent,
    });
  } else {
    if (cluster.isMaster) {
      function startWorker(counter: number) {
        const worker = cluster.fork();
        worker.send({
          type: "start",
          instanceId: `${
            instanceId || config.instanceId || generatedName
          }_${counter}`,
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
        silent,
      });
    }
  }
}

export type StartOpts = {
  isCluster: boolean;
  silent: boolean;
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
  await applyConfig(config);

  // Create the HttpServer
  const requestHandler = await httpConnections.createRequestHandler();

  let httpServer: HttpServer | HttpsServer;
  if (config.useHttps) {
    const options = {
      key: config.useHttps.key,
      cert: config.useHttps.cert,
    };
    httpServer = (config.createHttpsServer || httpsCreateServer)(
      options,
      requestHandler
    );
  } else {
    httpServer = (config.createHttpServer || httpCreateServer)(requestHandler);
  }

  // Attach webSocket servers
  let webSocketServer: WebSocket.Server | undefined = undefined;

  if (isWebSocketProxyConfig(config)) {
    webSocketServer = await webSocketConnections.setupRequestHandling(
      httpServer,
      config as WebSocketProxyAppConfig
    );
  }

  httpServer.listen(port);

  httpServer.on("close", () => {
    if (webSocketServer) {
      webSocketServer.close();
    }
  });

  async function closeServers() {
    if (webSocketServer) {
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

    startApp(
      port,
      instanceId,
      configFile,
      argv.nocluster ?? false,
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
}

export async function applyConfig(config: AppConfig) {
  await applicationState.init(config);
  webJobs.init(config);
  await httpConnections.init(config as HttpProxyAppConfig);
  if (isWebSocketProxyConfig(config)) {
    await webSocketConnections.init(config);
  }
}
