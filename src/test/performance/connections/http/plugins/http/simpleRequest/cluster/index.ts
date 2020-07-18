import { join } from "path";
import { Response } from "got/dist/source/core";
import startRetransmitTestProcess from "../../../../../../../utils/startRetransmitTestProcess";
import sendParallelRequests from "../../../../../../../utils/sendParallelRequests";
import startPerfTestBackends from "../startPerfTestBackends";
import {
  PerformanceTestAppInstance,
  PerformanceTestEnv,
} from "../../../../../..";

export default async function simpleRequestCluster(
  name: string,
  loops: number,
  parallel: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
) {
  const configFile = join(__dirname, "config.js");

  const instanceConfig = await startRetransmitTestProcess(
    testEnv.appRoot,
    configFile,
    {}
  );

  const count = 1000 * loops;

  app.pid = instanceConfig.pid;
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
    `http://localhost:${instanceConfig.port}/users`,
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
