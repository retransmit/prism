import * as redis from "redis";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import { startWithConfiguration } from "../../../../../..";
import got from "got/dist/source";
import { RedisServiceHttpRequest } from "../../../../../../types/http";
import { getResponse } from "../../../../../utils/http";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`rolls back`, async () => {
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

    const servers = await startWithConfiguration(undefined, undefined, config);

    app.servers = servers;

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
    const { port } = app.servers.httpServer.address() as any;

    const promisedServerRespose = got(`http://localhost:${port}/users`, {
      method: "POST",
      retry: 0,
    });

    const inputMessage = await promisedInputMessage;
    const redisInput = JSON.parse(inputMessage.message);

    const publisher = redis.createClient();

    const rollbackPromise = new Promise<RedisServiceHttpRequest>((success) => {
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
          status: 400,
          content: "Invalid request.",
        },
      })
    );

    const rollbackMessage = await rollbackPromise;

    const serverResponse = await getResponse(promisedServerRespose);
    serverResponse.statusCode.should.equal(400);
    serverResponse.body.should.equal(
      "Invalid request."
    );

    rollbackMessage.type.should.equal("rollback");
    rollbackMessage.request.path.should.equal("/users");
  });
}
