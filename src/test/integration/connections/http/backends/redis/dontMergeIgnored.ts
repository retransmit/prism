import { TestAppInstance } from "../../../../../test";
import { startWithConfiguration } from "../../../../../..";
import { createClient } from "redis";
import got from "got/dist/source";
import random from "../../../../../../lib/random";

export default async function (app: TestAppInstance) {
  it(`does not merge ignored results`, async () => {
    const config = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "redis" as "redis",
                  requestChannel: "input",
                },
                messagingservice: {
                  type: "redis" as "redis",
                  requestChannel: "input",
                  merge: false,
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
      json: { hello: "world" },
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
          content: {
            user: 1,
          },
        },
      })
    );

    publisher.publish(
      redisInput.responseChannel,
      JSON.stringify({
        id: redisInput.id,
        service: "messagingservice",
        response: {
          content: {
            message: "Hello world",
          },
        },
      })
    );

    const serverResponse = await promisedServerRespose;
    serverResponse.statusCode.should.equal(200);
    JSON.parse(serverResponse.body).should.deepEqual({
      user: 1,
    });
  });
}
