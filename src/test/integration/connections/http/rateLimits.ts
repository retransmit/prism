import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../lib/random";
import got, { CancelableRequest } from "got";
import { IAppConfig } from "../../../../types";
import { Response } from "got/dist/source/core";

export default async function (app: TestAppInstance) {
  it(`rate limits`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                }
              },
            },
          },
        },
        rateLimiting: {
          type: "ip",
          numRequests: 10,
          duration: 60000,
        },
      },
    };

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );

    const callCount = 0;
    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "GET",
            handleResponse: async (ctx) => {
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

    const promisedResponses: Promise<Response<string>>[] = [];

    for (let i = 0; i <= 11; i++) {
      const promisedResponse = got(`http://localhost:${port}/users`, {
        method: "GET",
        retry: 0,
      });
      promisedResponses.push(getResponse(promisedResponse));
    }

    const responses = await Promise.all(promisedResponses);

    responses[0].statusCode.should.equal(200);
    responses[0].body.should.equal("hello, world");
    responses[9].statusCode.should.equal(200);
    responses[9].body.should.equal("hello, world");
    responses[10].statusCode.should.equal(429);
    responses[10].body.should.equal("Too Many Requests.");
  });
}
