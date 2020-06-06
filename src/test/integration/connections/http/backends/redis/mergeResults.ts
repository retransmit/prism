import request = require("supertest");
import random from "../../../../../../lib/random";
import { TestAppInstance } from "../../../../../test";

export default async function (app: TestAppInstance) {
  it(`merges responses`, async () => {
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

    const serviceResults = [
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

    const result: any = {};

    const [response, json] = result;
    json.request.headers.origin.should.equal("http://localhost:3000");
    response.status.should.equal(200);
    response.body.should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
