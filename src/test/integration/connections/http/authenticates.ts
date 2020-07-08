import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../";
import got from "got";
import { UserAppConfig } from "../../../../types";
import startRetransmitTestInstance from "../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../test";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  const jwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1OTM4NDYzNTEsImV4cCI6MTgxNDY4NDc1MSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0._Fi5C7CUwSqOImUO3jIN-hMpKqcDmpdOl60lTa4aHMo";

  const invalidJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  const tests: [string, boolean, string][] = [
    ["authenticates with valid jwt", true, jwt],
    ["fails authentication with invalid jwt", false, invalidJwt],
  ];

  for (const [name, isValid, jwt] of tests) {
    const config: UserAppConfig = {
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
      const appControl = await startRetransmitTestInstance({ config });

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

      app.appControl = appControl;
      app.mockHttpServers = backendApps;      
      const { port } = appControl;

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
