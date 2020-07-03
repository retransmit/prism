import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../types";

export default async function (app: TestAppInstance) {
  const jwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6IjNjZDk2MGFmLTQyYjUtNDUxMC05MzZiLTljOWFkOWFlYWMxNiIsImlhdCI6MTU5Mzc4NTk2MywiZXhwIjoxNTkzNzg5NTYzfQ.mqMTAHoSkswODDsChy8k8368ZC_-UQr3FoNck_IyGUo";

  const tests: [string, boolean, string][] = [
    ["authenticates with valid jwt", true, jwt],
    ["fails authentication with invalid jwt", false, "incorrect_jwt"],
  ];

  for (const [name, isValid, jwt] of tests) {
    const config: AppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            GET: {
              caching: {
                expiry: 200,
              },
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                },
              },
            },
          },
        },
        authentication: {
          type: "jwt",
          key: "secret",
        },
      },
    };

    it(name, async () => {
      const servers = await startWithConfiguration(
        undefined,
        "testinstance",
        config
      );

      let userServiceCallCount = 0;

      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: [
            {
              path: "/users",
              method: "GET",
              handleResponse: async (ctx) => {
                userServiceCallCount++;
                ctx.body = "hello, world";
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
        method: "GET",
        retry: 0,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const response = await getResponse(promisedResponse);

      userServiceCallCount.should.equal(isValid ? 1 : 0);
      response.statusCode.should.equal(isValid ? 200 : 401);
      response.body.should.equal(isValid ? "hello, world" : "Unauthorized.");
    });
  }
}
