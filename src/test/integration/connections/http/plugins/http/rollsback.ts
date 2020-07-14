import { startBackends, getResponse } from "../../../../../utils/http";
import { Server } from "http";
import { TestAppInstance } from "../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`rolls back`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  rollback: (req) => ({
                    ...req,
                    path: "http://localhost:6666/users/remove",
                  }),
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

    const appControl = await startRetransmitTestInstance({ config });

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

      app.appControl = appControl;
      app.mockHttpServers = backendApps;


    const { port } = appControl;
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
