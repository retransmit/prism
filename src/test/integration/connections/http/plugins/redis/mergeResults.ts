import { TestAppInstance } from "../../../../../test";
import { createClient } from "redis";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startTestApp from "../../../../../startTestApp";

export default async function (app: TestAppInstance) {
  it(`merges responses`, async () => {
    const config: UserAppConfig = {
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

    const servers = await startTestApp({ config });

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
          body: {
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
          body: {
            message: "hello world",
          },
        },
      })
    );

    const serverResponse = await promisedServerRespose;
    serverResponse.statusCode.should.equal(200);
    JSON.parse(serverResponse.body).should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
