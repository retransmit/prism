import {
  PerformanceTestAppInstance,
  PerformanceTestEnv,
  PerformanceTestResult,
} from "../../../../..";
import startRetransmitTestInstance from "../../../../../../utils/startRetransmitTestInstance";
import { Response } from "got/dist/source/core";
import sendParallelRequests from "../../../../../../utils/sendParallelRequests";
import startPerfTestBackends from "./startPerfTestBackends";

export default async function simpleRequestBuffer(
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

  app.mockHttpServers = startPerfTestBackends();

  app.appControl = await startRetransmitTestInstance({ config });
  const { port } = app.appControl;

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
