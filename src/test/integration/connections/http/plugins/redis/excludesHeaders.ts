import { TestAppInstance } from "../../../../../test";
import { startWithConfiguration } from "../../../../../..";
import { createClient } from "redis";
import got from "got";
import random from "../../../../../../utils/random";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`excludes headers`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "redis" as "redis",
                  requestChannel: "input",
                  mapping: {
                    headers: {
                      exclude: ["x-app-instance"],
                    },
                  },
                },
              },
            },
          },
        },
        redis: {
          responseChannel: "output",
        },
      },
    };

    const servers = await startWithConfiguration(undefined, undefined, config);

    app.servers = servers;

    let subscriberCb: (channel: string, message: string) => void = (a, b) => {};

    const subscriber = createClient();
    subscriber.subscribe("input");
    subscriber.on("message", (c, m) => subscriberCb(c, m));

    let promisedInputMessage = new Promise<{
      channel: string;
      message: string;
    }>((success) => {
      subscriberCb = (channel, message) => success({ channel, message });
    });

    // Make the http request.
    const { port } = app.servers.httpServer.address() as any;

    const promisedServerRespose = got(`http://localhost:${port}/users`, {
      method: "POST",
      headers: {
        "x-app-instance": "myinst",
        "x-something-else": "somethingelse",
      },
      json: {
        username: "jeswin",
      },
      retry: 0,
    });

    const inputMessage = await promisedInputMessage;
    const redisInput = JSON.parse(inputMessage.message);

    const publisher = createClient();

    publisher.publish(
      redisInput.responseChannel,
      JSON.stringify({
        id: redisInput.id,
        service: "userservice",
        response: {
          body: `Contains headers: ${Object.keys(
            redisInput.request.headers
          ).filter((x) => x.startsWith("x-"))}`,
        },
      })
    );

    const serverResponse = await promisedServerRespose;
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Contains headers: x-something-else");
  });
}
