import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`excludes headers`, async () => {
    const config: AppConfig = {
      instanceId: random(),
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

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );

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

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    const { port } = app.servers.httpServer.address() as any;
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
    serverResponse.body.should.equal("Contains headers: x-something-else");
  });
}
