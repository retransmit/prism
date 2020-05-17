import request = require("supertest");
import { doPubSub } from "./utils";

export default async function (app: { instance: any },) {
  it(`merges results`, async () => {
    const config = {
      requestChannel: "input",
      responseChannel: "output",
      routes: {
        "/users": {
          POST: {
            services: {
              userservice: {},
              messagingservice: {},
            },
          },
        },
      },
    };

    const serviceResults = [
      {
        id: "temp",
        service: "userservice",
        success: true,
        response: {
          content: {
            user: 1,
          },
        },
      },
      {
        id: "temp",
        service: "messagingservice",
        success: true,
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
      serviceResults,
      (success, getJson) => {
        request(app.instance)
          .post("/users")
          .send({ hello: "world" })
          .set("origin", "http://localhost:3000")
          .then((x) => success([x, getJson()]));
      }
    );

    const [response, json] = result;
    json.data.headers.origin.should.equal("http://localhost:3000");
    response.body.should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
