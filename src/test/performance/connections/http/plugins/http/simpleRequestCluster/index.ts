import { join } from "path";
import { Response } from "got/dist/source/core";
import { PerformanceTestAppInstance, PerformanceTestEnv } from "../../../../..";
import startRetransmitTestProcess from "../../../../../../utils/startRetransmitTestProcess";
import { startBackends } from "../../../../../../utils/http";
import { HttpMethods } from "../../../../../../../types";
import sendParallelRequests from "../../../../../../utils/sendParallelRequests";

export default async function (
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

  app.pid = instanceConfig.pid;
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
