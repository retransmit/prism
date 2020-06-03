import request = require("supertest");
import { doPubSub } from "./utils";
import random from "../../../../../../lib/random";

export default async function (app: { instance: any }) {
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
          content: {
            message: "hello world",
          },
        },
      },
    ];

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

    const [response, json] = result;
    json.request.headers.origin.should.equal("http://localhost:3000");
    response.status.should.equal(200);
    response.body.should.deepEqual({
      user: 1,
    });
  });
}
