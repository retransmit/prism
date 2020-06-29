#!/usr/bin/env node
import yargs = require("yargs");
import WebSocket from "ws";
import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import * as httpTests from "./performance/connections/http";

export type PerformanceTestAppInstance = {
  servers: {
    httpServer: HttpServer | HttpsServer;
    webSocketServers: WebSocket.Server[];
    mockHttpServers?: (HttpServer | HttpsServer)[];
  };
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
    app: PerformanceTestAppInstance
  ) => Promise<PerformanceTestResult>;

  const listOfTests: [string, TestFunc][] = [
    ["http-http-simple-request", httpTests.httpSimpleRequest],
  ];

  const testsToRun = tests.includes("all")
    ? listOfTests
    : listOfTests.filter(([name, testFn]) => tests.includes(name));

  for (const [name, testFn] of testsToRun) {
    console.log(`Running performance test: ${name} ...`);
    try {
      const result = await testFn(name, count, app);
      const timeTaken = result.endTime - result.startTime;
      const timeInSeconds = (timeTaken / 1000).toFixed(3);
      console.log(`${name} (${result.numLoops} times) took ${timeInSeconds}s.`);
    } catch (ex) {
      console.log(ex.message);
    }
    process.exit();
  }
}

run();
