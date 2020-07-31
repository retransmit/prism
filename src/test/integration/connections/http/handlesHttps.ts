import { TestAppInstance } from "..";
import { TestEnv } from "../..";
import { UserAppConfig } from "../../../../types/config";
import startRetransmitTestInstance from "../../../utils/startRetransmitTestInstance";
import { startBackends, getResponse } from "../../../utils/http";
import got from "got/dist/source";
import { readFileSync } from "fs";
import { join } from "path";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`handles https`, async () => {
    const config: UserAppConfig = {
      useHttps: {
        cert: readFileSync(
          join(testEnv.testRoot, "fixtures/certs/localhost.crt")
        ).toString(),
        key: readFileSync(
          join(testEnv.testRoot, "fixtures/certs/localhost.key")
        ).toString(),
      },
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

    const appControl = await startRetransmitTestInstance({ config });

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "GET",
            handleResponse: async (ctx) => {
              ctx.body = `hello, world`;
            },
          },
        ],
      },
    ]);

    app.appControl = appControl;
    app.mockHttpServers = backendApps;

    const { port } = appControl;
    const promisedResponse = got(`https://localhost:${port}/users`, {
      method: "GET",
      retry: 0,
      https: {
        rejectUnauthorized: false,
      },
    });

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("hello, world");
  });
}
