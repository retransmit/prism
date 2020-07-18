#!/usr/bin/env node
import yargs = require("yargs");
import { join } from "path";
import { closeHttpServer } from "../../../../../../../utils/http/closeHttpServer";
import simpleRequestBaseline from "./baseline";
import simpleRequestBuffer from "./buffer";
import simpleRequestStream from "./stream";

import {
  PerformanceTestAppInstance,
  PerformanceTestEnv,
  PerformanceTestResult,
  getAppRoot,
} from "../../../../..";
import simpleRequestClusterBuffer from "./cluster-buffer";
import simpleRequestClusterStream from "./cluster-stream";

const argv = yargs.options({
  t: { type: "array", alias: "test" },
  l: { type: "number", alias: "loop" },
  p: { type: "number", alias: "parallel" },
}).argv;

async function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  console.log(
    "WARN: These tests exist just to make sure we don't introduce silly performance issues. These numbers are not at all useful for benchmarking."
  );

  const tests = argv.t ?? ["all"];
  const loop = argv.l ?? 1;
  const parallelRequests = argv.p ?? 10;

  let app: PerformanceTestAppInstance = { app: { servers: undefined } } as any;

  type TestFunc = (
    name: string,
    count: number,
    parallel: number,
    app: PerformanceTestAppInstance,
    testEnv: PerformanceTestEnv
  ) => Promise<PerformanceTestResult>;

  const testEnv = {
    appRoot: getAppRoot(),
    testRoot: join(__dirname, "../"),
  };

  const listOfTests: [string, TestFunc][] = [
    ["baseline", simpleRequestBaseline],
    ["buffer", simpleRequestBuffer],
    ["stream", simpleRequestStream],
    ["cluster-buffer", simpleRequestClusterBuffer],
    ["cluster-stream", simpleRequestClusterStream],
  ];

  const testsToRun = tests.includes("all")
    ? listOfTests
    : listOfTests.filter(([name]) => tests.includes(name));

  for (const [name, testFn] of testsToRun) {
    console.log(`Running performance test: ${name} ...`);

    (app as any).appControl = undefined;
    app.mockHttpServers = undefined;

    try {
      const result = await testFn(name, loop, parallelRequests, app, testEnv);
      const timeTaken = result.endTime - result.startTime;
      const timeInSeconds = (timeTaken / 1000).toFixed(3);
      const rps = result.count / (timeTaken / 1000);
      console.log(
        `${name} ${result.count} times took ${timeInSeconds}s (${rps.toFixed(
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
