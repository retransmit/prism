import { startWithConfiguration } from "../../../../../..";
import { startBackends } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../../../types";
import { join } from "path";

export default async function (app: TestAppInstance) {
  it(`handles a request stream`, async () => {
    const config: AppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/images/(.*)": {
            GET: {
              requestBodyIsStream: true,
              services: {
                imageservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/images/:0",
                },
              },
            },
          },
          "/users": {
            GET: {
              requestBodyIsStream: true,
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
        routes: [
          {
            path: "/users",
            method: "POST",
            handleResponse: async (ctx) => {
              console.log("---", ctx.path, ctx.request.body);
              ctx.status = 200;
              ctx.set({ "x-test-id": "100" });
              ctx.body = "hello, world";
            },
          },
        ],
        static: {
          baseUrl: "/images",
          dirPath: join(__dirname, "../../../../../fixtures/static"),
        },
      },
    ]);

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    // const { port } = app.servers.httpServer.address() as any;
    // const serverResponse = await got(`http://localhost:${port}/users`, {
    //   method: "GET",
    //   retry: 0,
    // });

    const { port } = app.servers.httpServer.address() as any;
    const serverResponse = await got(
      `http://localhost:${port}/images/sandman.jpg`,
      {
        method: "GET",
        retry: 0,
      }
    );

    serverResponse.statusCode.should.equal(200);
    // JSON.parse(serverResponse.body).should.deepEqual({
    //   user: 1,
    // });
  });
}
