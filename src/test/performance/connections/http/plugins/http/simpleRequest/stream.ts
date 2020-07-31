import { UserAppConfig } from "../../../../../../../types/config";
import { Response } from "got/dist/source/core";
import startRetransmitTestInstance from "../../../../../../utils/startRetransmitTestInstance";
import sendParallelRequests from "../../../../../../utils/sendParallelRequests";
import startPerfTestBackends from "./startPerfTestBackends";
import { PerformanceTestAppInstance, PerformanceTestEnv, PerformanceTestResult } from "../../../../..";

export default async function simpleRequestStream(
  name: string,
  loops: number,
  parallel: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
): Promise<PerformanceTestResult> {
  const count = 1000 * loops;

  const config: UserAppConfig = {
    http: {
      routes: {
        "/users": {
          GET: {
            useStream: true,
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
