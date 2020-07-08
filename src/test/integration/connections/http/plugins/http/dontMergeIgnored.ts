import { startBackends } from "../../../../../utils/http";
import { TestAppInstance } from "../../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startRetransmitTestInstance from "../../../../utils/startRetransmitTestInstance";

export default async function (app: TestAppInstance) {
  it(`does not merge ignored results`, async () => {
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
                messagingservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/messages",
                  merge: false,
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
                message: "hello, world",
              },
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
    JSON.parse(serverResponse.body).should.deepEqual({
      user: 1,
    });
  });
}
