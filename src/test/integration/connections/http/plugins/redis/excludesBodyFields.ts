import { TestAppInstance } from "../../../../";
import { createClient } from "redis";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startTestApp from "../../../../utils/startTestApp";

export default async function (app: TestAppInstance) {
  it(`excludes body fields`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "redis" as "redis",
                  requestChannel: "input",
                  mapping: {
                    fields: {
                      exclude: ["username"],
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

    const appControl = await startTestApp({ config });

    app.appControl = appControl;

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
    const { port } = appControl;

    const promisedServerRespose = got(`http://localhost:${port}/users`, {
      method: "POST",
      json: { username: "jeswin", account: "1234" },
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
          body: `Contains fields: ${Object.keys(redisInput.request.body)}`,
        },
      })
    );

    const serverResponse = await promisedServerRespose;
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Contains fields: account");
  });
}
