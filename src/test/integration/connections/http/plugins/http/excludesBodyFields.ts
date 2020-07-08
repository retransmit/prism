import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startTestApp from "../../../../utils/startTestApp";

export default async function (app: TestAppInstance) {
  it(`excludes body fields`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  mapping: {
                    fields: {
                      exclude: ["username"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const appControl = await startTestApp({ config });

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = `Contains fields: ${Object.keys(ctx.request.body)}`;
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
      json: { username: "jeswin", account: "1234" },
      retry: 0,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Contains fields: account");
  });
}
