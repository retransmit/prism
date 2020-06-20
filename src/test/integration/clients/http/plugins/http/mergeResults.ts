import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { closeHttpServer } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import got from "got";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`merges responses`, async () => {
    const config: IAppConfig = {
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
                messagingservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/messages",
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
            method: "GET",
            response: {
              body: {
                user: 1,
              },
            },
          },
        ],
      },
      {
        port: 6667,
        routes: [
          {
            path: "/messages",
            method: "GET",
            response: {
              body: {
                message: "hello world",
              },
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
      method: "GET",
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    JSON.parse(serverResponse.body).should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
