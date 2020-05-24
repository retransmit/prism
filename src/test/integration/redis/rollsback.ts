import request = require("supertest");
import { doPubSub } from "./utils";
import * as redis from "redis";

export default async function (app: { instance: any }) {
  it(`rolls back`, async () => {
    const config = {
      instanceId: "testinstance",
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "redis" as "redis",
                  config: {
                    requestChannel: "input",
                    responseChannel: "output",
                  },
                },
                messagingservice: {
                  type: "redis" as "redis",
                  config: {
                    requestChannel: "input",
                    responseChannel: "output",
                  },
                },
              },
            },
          },
        }
      },
    };

    const serviceResponses = [
      {
        id: "temp",
        service: "userservice",
        response: {
          content: {
            user: 1,
          },
        },
      },
      {
        id: "temp",
        service: "messagingservice",
        response: {
          status: 400,
          content: "Invalid request",
        },
      },
    ];

    const rollbackPromise = new Promise((success) => {
      const client = redis.createClient();
      client.subscribe("input");
      client.on("message", (channel, message) => {
        const jsonMessage = JSON.parse(message);
        if (channel === "input" && jsonMessage.type === "rollback") {
          success(jsonMessage);
        }
      });
    });

    const result = await doPubSub(
      app,
      config,
      serviceResponses,
      (success, getJson) => {
        request(app.instance)
          .post("/users")
          .send({ hello: "world" })
          .set("origin", "http://localhost:3000")
          .then((x) => success([x, getJson()]));
      }
    );

    const rollbackMessage: any = await rollbackPromise;

    const [response, json] = result;
    json.request.headers.origin.should.equal("http://localhost:3000");
    response.status.should.equal(400);
    response.text.should.equal("POST: Invalid request");

    rollbackMessage.type.should.equal("rollback");
    rollbackMessage.request.path.should.equal("/users");
  });
}
