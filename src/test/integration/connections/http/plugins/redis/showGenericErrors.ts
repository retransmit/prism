import { TestAppInstance } from "../../../../../test";
import { createClient } from "redis";
import { getResponse } from "../../../../../utils/http";
import got from "got";
import { UserAppConfig } from "../../../../../../types";
import startTestApp from "../../../../startTestApp";

const genericErrorsForRoute = [
  "shows generic errors for service",
  {
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
            genericErrors: true,
          },
        },
      },
      redis: {
        responseChannel: "output",
      },
    },
  },
];

const genericErrorsGlobally = [
  "shows generic errors for all services",
  {
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
      genericErrors: true,
      redis: {
        responseChannel: "output",
      },
    },
  },
];

const configs = [genericErrorsForRoute, genericErrorsGlobally] as [
  string,
  UserAppConfig
][];

export default async function (app: TestAppInstance) {
  configs.forEach((testCfg: [string, UserAppConfig]) => {
    const [testName, config] = testCfg;
    it(testName, async () => {
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
                genericErrors: true,
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
            body: "Hello world",
          },
        })
      );

      const serverResponse = await getResponse(promisedServerRespose);
      serverResponse.statusCode.should.equal(500);
      serverResponse.body.should.equal("Internal Server Error.");
    });
  });
}
