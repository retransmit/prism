import { startBackends } from "../../../../../../utils/http";
import { TestAppInstance } from "../../../..";
import { UserAppConfig } from "../../../../../../../types/config";
import got from "got";
import startRetransmitTestInstance from "../../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`handles a stream with text response`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            GET: {
              useStream: true,
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
              ctx.status = 200;
              ctx.set({ "x-test-id": "100" });
              ctx.body = "hello, world";
            },
          },
        ],
      },
    ]);

    app.appControl = appControl;
    app.mockHttpServers = backendApps;

    const { port } = appControl;
    const serverResponse = await got(`http://localhost:${port}/users`, {
      method: "GET",
      retry: 0,
    });

    serverResponse.statusCode.should.equal(200);
    (serverResponse.headers as any)["x-test-id"].should.equal("100");
    serverResponse.body.should.equal("hello, world");
  });
}
