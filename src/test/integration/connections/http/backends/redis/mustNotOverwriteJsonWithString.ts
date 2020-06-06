import request = require("supertest");
import random from "../../../../../../lib/random";
import { TestAppInstance } from "../../../../../test";

export default async function (app: TestAppInstance) {
  it(`must not overwrite json content with string content`, async () => {
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
          content: "Hello world",
        },
      },
    ];

    const result: any = {};

    const [response, json] = result;
    json.request.headers.origin.should.equal("http://localhost:3000");
    response.status.should.equal(500);
    response.text.should.equal(
      "messagingservice returned a response which will overwrite current response."
    );
  });
}