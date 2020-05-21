#!/usr/bin/env node

import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import yargs = require("yargs");
import { join } from "path";

import * as config from "./config";
import { IAppConfig } from "./types";

import { createHandler } from "./handler";
import init from "./backends/redis/init";

const packageJson = require("../package.json");

const argv = yargs.options({
  c: { type: "string", alias: "config" },
  p: { type: "number", default: 8080, alias: "port" },
  v: { type: "boolean", alias: "version" },
}).argv;

export async function startApp(port: number, configFile: string) {
  const appConfig: IAppConfig = require(configFile);
  return await startWithConfiguration(port, appConfig);
}

export async function startWithConfiguration(
  port: number | undefined,
  appConfig: IAppConfig
) {
  // Set up the config
  config.set(appConfig);

  // Init redis
  await init();

  // Set up routes
  const router = new Router();

  const routes = config.get().routes;

  for (const route in appConfig.routes) {
    const routeConfig = routes[route];

    if (routeConfig["GET"]) {
      router.get(route, createHandler("GET"));
    }

    if (routeConfig["POST"]) {
      router.post(route, createHandler("POST"));
    }

    if (routeConfig["PUT"]) {
      router.put(route, createHandler("PUT"));
    }

    if (routeConfig["DELETE"]) {
      router.del(route, createHandler("DELETE"));
    }

    if (routeConfig["PATCH"]) {
      router.patch(route, createHandler("PATCH"));
    }
  }

  // Start app
  var app = new Koa();
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  if (port) {
    app.listen(port);
  } else {
    app.listen();
  }

  return app;
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

    startApp(port, configDir);
    console.log(`listening on port ${port}`);
  }
}
