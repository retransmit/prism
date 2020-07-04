import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../utils/random";
import got from "got";
import { AppConfig } from "../../../../types";

export default async function (app: TestAppInstance) {
  const jwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikplc3dpbiIsImFkbWluIjp0cnVlLCJqdGkiOiI2MjZkY2NhZC03NzIwLTQ0NjEtOGVlNC0zZTU2YmM0NjQxYjMiLCJpYXQiOjE1OTM4MzI1ODYsImV4cCI6MTU5MzgzNjIxMX0.RL4MyqIyqse9e3h0I5jMF_SywqS3Z2olgNlkF1om3Bw";

  const invalidJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  const tests: [string, boolean, string][] = [
    ["authenticates with valid jwt", true, jwt],
    ["fails authentication with invalid jwt", false, invalidJwt],
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
