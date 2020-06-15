import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { closeHttpServer } from "../../../../../utils/http";
import { Server } from "http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import got from "got";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`rolls back`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  rollbackUrl: "http://localhost:6666/users/remove",
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

    let calledRollback = false;
    let backendApps: Server[] = [];

    const calledPromise = new Promise((success) => {
      // Start mock servers.
      backendApps = startBackends([
        {
          port: 6666,
          afterResponse: async (ctx: any) => {
            if (ctx.path === "/users/remove" && ctx.method === "POST") {
              ctx.body = "Deleted";
              calledRollback = true;
              success();
              return true;
            }
          },
          routes: [
            {
              path: "/users",
              method: "POST",
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
              method: "POST",
              response: {
                status: 400,
                body: "I don't like the input.",
              },
            },
          ],
        },
      ]);
    });

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    const { port } = app.servers.httpServer.address() as any;
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "POST",
      json: { hello: "world" },
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(400);
    serverResponse.body.should.equal("I don't like the input.");

    await calledPromise;
    calledRollback.should.be.true();
  });
}
