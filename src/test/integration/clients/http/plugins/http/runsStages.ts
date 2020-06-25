import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import got from "got";
import { IAppConfig, HttpRequest } from "../../../../../../types";
import {
  FetchedHttpRequestHandlerResponse,
  HttpServiceHttpRequestHandlerConfig,
} from "../../../../../../types/http";

export default async function (app: TestAppInstance) {
  it(`runs stages`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  stage: 1,
                },
                messageservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/users",
                  stage: 2,
                  onRequest: async (request, responses) => {
                    return {
                      handled: false,
                      request: {
                        ...request,
                        body: {
                          ...request.body,
                          userid: responses[0].response.body.userid,
                        },
                      },
                    };
                  },
                } as HttpServiceHttpRequestHandlerConfig,
              },
            },
          },
        },
      },
    };

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = {
                userid: 103,
              };
            },
          },
        ],
      },
      {
        port: 6667,
        routes: [
          {
            path: "/users",
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = {
                messages: `There are 10 messages for userid ${ctx.request.body.userid}.`,
              };
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
      json: { username: "jeswin" },
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    JSON.parse(serverResponse.body).should.deepEqual({
      userid: 103,
      messages: "There are 10 messages for userid 103.",
    });
  });
}
