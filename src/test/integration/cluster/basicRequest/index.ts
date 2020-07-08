import { join } from "path";
import { startRetransmitTestProcess } from "../utils/startRetransmitTestProcess";
import { startBackends, getResponse } from "../../../utils/http";
import got from "got/dist/source";
import { TestAppInstance } from "..";
import { TestEnv } from "../../../test";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`responds to GET request from a cluster`, async () => {
    const configFile = join(__dirname, "config.js");

    const instanceConfig = await startRetransmitTestProcess(
      testEnv.appRoot,
      configFile,
      {}
    );

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "GET",
            response: { body: `GET: Everything worked.` },
          },
        ],
      },
    ]);

    app.mockHttpServers = backendApps;

    const { port } = instanceConfig;
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "GET",
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal(`GET: Everything worked.`);
  });
}
