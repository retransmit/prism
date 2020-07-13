import { startBackends, getResponse } from "../../../../../utils/http";
import got from "got/dist/source";
import {
  PerformanceTestAppInstance,
  PerformanceTestResult,
} from "../../../../../performance";
import { HttpMethods, UserAppConfig } from "../../../../../../types";
import startRetransmitTestInstance from "../../../../../integration/connections/utils/startRetransmitTestInstance";

export default async function (
  name: string,
  count: number,
  app: PerformanceTestAppInstance
): Promise<PerformanceTestResult> {
  const numLoops = 1000 * count;

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

  // Start mock servers.
  const backendApps = startBackends([
    {
      port: 6666,
      routes: (["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethods[]).map(
        (method) => ({
          path: "/users",
          method,
          response: { body: `Hello world.` },
        })
      ),
    },
  ]);

  const appControl = await startRetransmitTestInstance({ config });
  app.appControl = appControl;
  const { port } = appControl;

  app.mockHttpServers = backendApps;

  const startTime = Date.now();

  for (let i = 0; i < numLoops; i++) {
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "GET",
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    if (
      serverResponse.statusCode !== 200 ||
      serverResponse.body !== "Hello world."
    ) {
      throw new Error(`${name} test failed.`);
    }
  }

  const endTime = Date.now();

  return {
    numLoops,
    startTime,
    endTime,
  };
}
