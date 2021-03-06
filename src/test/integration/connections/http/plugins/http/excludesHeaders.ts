import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types/config";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`excludes headers`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  mapping: {
                    headers: {
                      exclude: ["x-app-instance"],
                    },
                  },
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
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = `Contains headers: ${Object.keys(
                ctx.headers
              ).filter((x) => x.startsWith("x-"))}`;
            },
          },
        ],
      },
    ]);

    app.appControl = appControl;
    app.mockHttpServers = backendApps;

    const { port } = appControl;
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "POST",
      headers: {
        "x-app-instance": "myinst",
        "x-something-else": "somethingelse",
      },
      json: { username: "jeswin" },
      retry: 0,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal(
      "Contains headers: x-something-else,x-forwarded-host"
    );
  });
}
