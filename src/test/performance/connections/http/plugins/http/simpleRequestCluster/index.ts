import { join } from "path";
import got from "got/dist/source";
import { PerformanceTestAppInstance, PerformanceTestEnv } from "../../../../..";
import startRetransmitTestProcess from "../../../../../../utils/startRetransmitTestProcess";
import { startBackends, getResponse } from "../../../../../../utils/http";
import { HttpMethods } from "../../../../../../../types";
import sleep from "../../../../../../../utils/sleep";

export default async function (
  name: string,
  count: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
) {
  const configFile = join(__dirname, "config.js");

  const instanceConfig = await startRetransmitTestProcess(
    testEnv.appRoot,
    configFile,
    {}
  );

  await sleep(5000);

  const numLoops = 1000 * count;

  // Start mock servers.
  const backends = startBackends([
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

  app.mockHttpServers = backends;

  const startTime = Date.now();

  for (let i = 0; i < numLoops; i++) {
    const promisedResponse = got(
      `http://localhost:${instanceConfig.port}/users`,
      {
        method: "GET",
        retry: 0,
      }
    );

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
