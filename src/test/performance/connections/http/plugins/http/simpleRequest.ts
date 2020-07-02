import random from "../../../../../../utils/random";
import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import got from "got/dist/source";
import {
  PerformanceTestAppInstance,
  PerformanceTestResult,
} from "../../../../../performance";
import { HttpMethods } from "../../../../../../types";

export default async function (
  name: string,
  count: number,
  app: PerformanceTestAppInstance
): Promise<PerformanceTestResult> {
  const numLoops = 1000 * count;

  const config = {
    instanceId: random(),
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

  const servers = await startWithConfiguration(
    undefined,
    "testinstance",
    config
  );

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

  app.servers = {
    ...servers,
    mockHttpServers: backendApps,
  };

  const { port } = servers.httpServer.address() as any;

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
