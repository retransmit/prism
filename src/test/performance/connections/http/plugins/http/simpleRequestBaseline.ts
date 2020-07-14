import { startBackends, getResponse } from "../../../../../utils/http";
import got from "got/dist/source";
import {
  PerformanceTestAppInstance,
  PerformanceTestResult,
  PerformanceTestEnv,
} from "../../../..";
import { Response } from "got/dist/source/core";
import { HttpMethods } from "../../../../../../types";
import sendParallelRequests from "../../../../../utils/sendParallelRequests";

export default async function (
  name: string,
  loops: number,
  parallel: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
): Promise<PerformanceTestResult> {
  const count = 1000 * loops;

  // Start mock servers.
  const backends = startBackends([
    {
      port: 6666,
      routes: (["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethods[]).map(
        (method) => ({
          path: "/users",
          method,
          handleResponse: async (ctx) => {
            ctx.body = "hello, world";
          },
        })
      ),
    },
  ]);

  app.mockHttpServers = backends;

  const startTime = Date.now();

  function onResponse(serverResponse: Response<string>) {
    if (
      serverResponse.statusCode !== 200 ||
      serverResponse.body !== "hello, world"
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
