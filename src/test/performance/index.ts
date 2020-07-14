#!/usr/bin/env node
import yargs = require("yargs");
import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import * as httpTests from "./connections/http";
import { AppControl } from "../..";
import { closeHttpServer } from "../../utils/http/closeHttpServer";
import { join } from "path";

export type PerformanceTestEnv = {
  appRoot: string;
  testRoot: string;
};

export type PerformanceTestAppInstance = {
  pid?: number;
  appControl?: AppControl;
  mockHttpServers?: (HttpServer | HttpsServer)[];
};

export type PerformanceTestResult = {
  numLoops: number;
  startTime: number;
  endTime: number;
};

const argv = yargs.options({
  t: { type: "array", alias: "test" },
  n: { type: "number", alias: "num" },
}).argv;

async function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  console.log(
    "WARN: These tests exist just to make sure we don't introduce silly performance issues. These numbers are not at all useful for benchmarking."
  );

  const tests = argv.t || ["all"];
  const count = argv.n || 1;

  let app: PerformanceTestAppInstance = { app: { servers: undefined } } as any;

  type TestFunc = (
    name: string,
    count: number,
    app: PerformanceTestAppInstance,
    testEnv: PerformanceTestEnv
  ) => Promise<PerformanceTestResult>;

  const testEnv = {
    appRoot: join(__dirname, "../../"),
    testRoot: join(__dirname, "../"),
  };

  const listOfTests: [string, TestFunc][] = [
    ["http-http-simple-request-baseline", httpTests.httpSimpleRequestBaseline],
    ["http-http-simple-request", httpTests.httpSimpleRequest],
    ["http-http-simple-request-stream", httpTests.httpSimpleRequestStream],
  ];

  const testsToRun = tests.includes("all")
    ? listOfTests
    : listOfTests.filter(([name]) => tests.includes(name));

  for (const [name, testFn] of testsToRun) {
    console.log(`Running performance test: ${name} ...`);

    (app as any).appControl = undefined;
    app.mockHttpServers = undefined;

    try {
      const result = await testFn(name, count, app, testEnv);
      const timeTaken = result.endTime - result.startTime;
      const timeInSeconds = (timeTaken / 1000).toFixed(3);
      const rps = result.numLoops / (timeTaken / 1000);
      console.log(
        `${name} ${result.numLoops} times took ${timeInSeconds}s (${rps.toFixed(
          2
        )} rps). `
      );
    } catch (ex) {
      console.log(ex.message);
    }

    await closeServers(app);
  }
  process.exit();
}

async function closeServers(app: PerformanceTestAppInstance) {
  if (app.mockHttpServers) {
    for (const mockHttpServer of app.mockHttpServers) {
      await closeHttpServer(mockHttpServer);
    }
  }

  if (app.appControl) {
    await app.appControl.closeServers();
  }

  if (app.pid) {
    process.kill(app.pid);
  }
}

run();
