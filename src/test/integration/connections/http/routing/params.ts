import { startBackends } from "../../../../utils/http";
import { TestAppInstance } from "../../../../test";
import random from "../../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../../types";
import { startWithConfiguration } from "../../../../..";

export default async function (app: TestAppInstance) {
  it(`handles params`, async () => {
    const config: AppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users/:id": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users/:id",
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
            path: "/users/100",
            method: "GET",
            handleResponse: async (ctx) => {
              ctx.body = "hello, world";
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
    const serverResponse = await got(
      `http://localhost:${port}/users/100`,
      {
        method: "GET",
        retry: 0,
      }
    );

    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("hello, world");
  });
}
