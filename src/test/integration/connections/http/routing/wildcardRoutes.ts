import { startBackends } from "../../../../utils/http";
import { TestAppInstance } from "../../";
import got from "got";
import { UserAppConfig } from "../../../../../types";
import startRetransmitTestInstance from "../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../../test";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`handles wildcard routes`, async () => {
    const config: UserAppConfig = {
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

    const appControl = await startRetransmitTestInstance({ config });

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

      app.appControl = appControl;
      app.mockHttpServers = backendApps;


    const { port } = appControl;
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
