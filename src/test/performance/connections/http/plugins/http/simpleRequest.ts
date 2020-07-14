import { startBackends, getResponse } from "../../../../../utils/http";
import got from "got/dist/source";
import {
  PerformanceTestAppInstance,
  PerformanceTestResult,
  PerformanceTestEnv,
} from "../../../..";
import { HttpMethods } from "../../../../../../types";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { Response } from "got/dist/source/core";
import sendParallelRequests from "../../../../../utils/sendParallelRequests";

export default async function (
  name: string,
  loops: number,
  parallel: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
): Promise<PerformanceTestResult> {
  const count = 1000 * loops;

  const config = {
    http: {
      routes: {
        "/users": {
          GET: {
            services: {
              userservice: {
                type: "http" as "http",
                url: "http://localhost:6666/users",
              },
            },
          },
        },
      },
    },
  };

  // Start mock servers.
  const backendApps = startBackends([
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

  app.appControl = await startRetransmitTestInstance({ config });
  const { port } = app.appControl;

  app.mockHttpServers = backendApps;

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
    `http://localhost:${port}/users`,
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
