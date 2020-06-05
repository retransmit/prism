import request = require("supertest");
import { doPubSub } from "../../../../../utils/redis";
import * as redis from "redis";
import random from "../../../../../../lib/random";
import { TestAppInstance } from "../../../../../test";

export default async function (app: TestAppInstance) {
  it(`rolls back`, async () => {
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
        request(app.servers.httpServer)
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
