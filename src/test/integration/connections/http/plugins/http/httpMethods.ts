import { HttpMethods, IAppConfig } from "../../../../../../types";
import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import got from "got";

export default async function (app: TestAppInstance) {
  function makeConfig(options: { method: HttpMethods }): IAppConfig {
    return {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            [options.method]: {
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
  }

  const httpMethodTests: HttpMethods[] = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ];

  httpMethodTests.forEach((method) => {
    it(`sends an HTTP ${method} request to the backend`, async () => {
      const config = makeConfig({ method });

      const servers = await startWithConfiguration(
        undefined,
        "testinstance",
        config
      );

      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: ([
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
          ] as HttpMethods[]).map((method) => ({
            path: "/users",
            method,
            response: { body: `${method}: Everything worked.` },
          })),
        },
      ]);

      app.servers = {
        ...servers,
        mockHttpServers: backendApps,
      };

      const { port } = app.servers.httpServer.address() as any;
      const promisedResponse = got(`http://localhost:${port}/users`, {
        method,
        retry: 0,
        json:
          method !== "GET" && method !== "DELETE"
            ? { hello: "world" }
            : undefined,
      });

      const serverResponse = await getResponse(promisedResponse);
      serverResponse.statusCode.should.equal(200);
      serverResponse.body.should.equal(`${method}: Everything worked.`);
    });
  });
}
