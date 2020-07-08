import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../../../types";
import startTestApp from "../../../../../startTestApp";

export default async function (app: TestAppInstance) {
  it(`must not overwrite json content with string content`, async () => {
    const config: AppConfig = {
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

    const servers = await startTestApp(config);

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
            response: { body: "hello world" },
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
    serverResponse.statusCode.should.equal(500);
    serverResponse.body.should.equal(
      "Cannot merge multiple types of content. messagingservice is returned a string response while the current response is an object."
    );
  });
}
