import {
  PerformanceTestAppInstance,
  PerformanceTestEnv,
  PerformanceTestResult,
} from "../../../../..";
import { Response } from "got/dist/source/core";
import sendParallelRequests from "../../../../../../utils/sendParallelRequests";
import startPerfTestBackends from "./startPerfTestBackends";

const { argv } = require("yargs");

export default async function simpleRequestBaseline(
  name: string,
  loops: number,
  parallel: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
): Promise<PerformanceTestResult> {
  const count = 1000 * loops;

  app.mockHttpServers = startPerfTestBackends();

  const startTime = Date.now();

  function onResponse(serverResponse: Response<string>) {
    if (
      serverResponse.statusCode !== 200 ||
      !serverResponse.body.startsWith("hello, world")
    ) {
      throw new Error(`${name} test failed.`);
    }
  }

  await sendParallelRequests(
    `http://localhost:6666/users`,
    "GET",
    onResponse,
    count,
    parallel
  );

  const endTime = Date.now();

  return {
    count,
    startTime,
    endTime,
  };
}
