import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startRetransmitTestInstance from "../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../../../test";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`can send x-www-form-urlencoded requests`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  contentEncoding: "application/x-www-form-urlencoded",
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
              ctx.body = `Request was encoded as ${
                ctx.request.headers["content-type"] ||
                ctx.request.headers["Content-Type"]
              }.`;
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
      json: { username: "jeswin" },
      retry: 0,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal(
      "Request was encoded as application/x-www-form-urlencoded."
    );
  });
}
