import { HttpMethods, IAppConfig } from "../../../../../../types";
import { TestAppInstance } from "../../../../../test";
import { startWithConfiguration } from "../../../../../..";
import { createClient } from "redis";
import got from "got";
import random from "../../../../../../lib/random";

export default async function (app: TestAppInstance) {
  function makeConfig(options: { method: HttpMethods }): IAppConfig {
    return {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            [options.method]: {
              services: {
                userservice: {
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
  }

  const httpMethodTests: HttpMethods[] = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ];

  httpMethodTests.forEach((method) => {
    it(`adds ${method} request to the channel`, async () => {
      const config = makeConfig({ method });

      const servers = await startWithConfiguration(
        undefined,
        undefined,
        config
      );

      app.servers = servers;

      let subscriberCb: (channel: string, message: string) => void = (
        a,
        b
      ) => {};

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
      const promisedServerRespose =
        method === "GET" || method === "DELETE"
          ? got(`http://localhost:${port}/users`, { method, retry: 0 })
          : got(`http://localhost:${port}/users`, {
              method,
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
            body: `${redisInput.request.method}: Everything worked.`,
          },
        })
      );

      const serverResponse = await promisedServerRespose;
      serverResponse.statusCode.should.equal(200);
      serverResponse.body.should.equal(`${method}: Everything worked.`);
    });
  });
}
