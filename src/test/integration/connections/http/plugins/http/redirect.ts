import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types/config";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`redirects`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            GET: {
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
              ctx.redirect(
                `http://localhost:6666/v1/usermanage?n1=${ctx.query.name}&a1=${ctx.query.age}`
              );
            },
          },
          {
            path: "/v1/usermanage",
            method: "GET",
            handleResponse: async (ctx) => {
              ctx.body = `Redirected with query ${JSON.stringify(ctx.query)}`;
            },
          },
        ],
      },
    ]);

      app.appControl = appControl;
      app.mockHttpServers = backendApps;


    const { port } = appControl;
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "GET",
      searchParams: {
        name: "jeswin",
        age: "39",
      },
      retry: 0,
      followRedirect: true,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal(
      `Redirected with query {"n1":"jeswin","a1":"39"}`
    );
  });
}
