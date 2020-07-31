import * as redis from "redis";
import { TestAppInstance } from "../../..";
import got from "got";
import { RedisHttpRequest } from "../../../../../../types/config/httpProxy";
import { getResponse } from "../../../../../utils/http";
import { UserAppConfig } from "../../../../../../types/config";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`rolls back`, async () => {
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

    const appControl = await startRetransmitTestInstance({ config });

    app.appControl = appControl;

    let subscriberCb: (channel: string, message: string) => void = (a, b) => {};

    const subscriber = redis.createClient();
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
      retry: 0,
    });

    const inputMessage = await promisedInputMessage;
    const redisInput = JSON.parse(inputMessage.message);

    const publisher = redis.createClient();

    const rollbackPromise = new Promise<RedisHttpRequest>((success) => {
      const client = redis.createClient();
      client.subscribe("input");
      client.on("message", (channel, message) => {
        const jsonMessage = JSON.parse(message);
        if (channel === "input" && jsonMessage.type === "rollback") {
          success(jsonMessage);
        }
      });
    });

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
          status: 400,
          body: "Invalid request.",
        },
      })
    );

    const rollbackMessage = await rollbackPromise;

    const serverResponse = await getResponse(promisedServerRespose);
    serverResponse.statusCode.should.equal(400);
    serverResponse.body.should.equal("Invalid request.");

    rollbackMessage.type.should.equal("rollback");
    rollbackMessage.request.path.should.equal("/users");
  });
}
