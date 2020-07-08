import { join } from "path";
import { startRetransmitTestProcess } from "../utils/startRetransmitTestProcess";
import { startBackends, getResponse } from "../../../utils/http";
import got from "got/dist/source";

export default async function () {
  it(`responds to GET request from a cluster`, async () => {
    const configFile = join(__dirname, "config.js");

    const instanceConfig = await startRetransmitTestProcess(configFile);

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

    const promisedResponse = got(
      `http://localhost:${instanceConfig.port}/users`,
      {
        method: "POST",
        headers: {
          "x-app-instance": "myinst",
          "x-something-else": "somethingelse",
        },
        json: { username: "jeswin" },
        retry: 0,
      }
    );

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Contains headers: x-something-else");
  });
}
