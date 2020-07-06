import { startBackends } from "../../../../utils/http";
import { TestAppInstance } from "../../../../test";
import random from "../../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../../types";
import { startWithConfiguration } from "../../../../..";

export default async function (app: TestAppInstance) {
  it(`handles wildcard routes`, async () => {
    const config: AppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users/:id/a/(.*)": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users/:id/a/b/:0",
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
            path: "/users/100/a/b/boom/shanker",
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
      `http://localhost:${port}/users/100/a/boom/shanker`,
      {
        method: "GET",
        retry: 0,
      }
    );

    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("hello, world");
  });
}
