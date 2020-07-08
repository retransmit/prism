import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startTestApp from "../../../../../startTestApp";

export default async function (app: TestAppInstance) {
  it(`maps headers`, async () => {
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
                    headers: {
                      include: {
                        "x-app-instance": "x-app-id",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const servers = await startTestApp({ config });

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = `Value of the header was ${ctx.headers["x-app-id"]}`;
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
      method: "POST",
      headers: {
        "x-app-instance": "myinst",
      },
      json: { username: "jeswin" },
      retry: 0,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Value of the header was myinst");
  });
}
