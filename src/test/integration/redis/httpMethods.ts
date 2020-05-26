import { HttpMethods, IAppConfig } from "../../../types";
import request = require("supertest");
import { doPubSub } from "./utils";
import random from "../../../lib/random";

export default async function (app: { instance: any }) {
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
                  config: {
                    requestChannel: "input",
                  },
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

  const httpMethodTests: [
    HttpMethods,
    (req: request.SuperTest<request.Test>, url: string) => request.Test
  ][] = [
    ["GET", (req, url) => req.get(url)],
    ["POST", (req, url) => req.post(url)],
    ["PUT", (req, url) => req.put(url)],
    ["DELETE", (req, url) => req.delete(url)],
    ["PATCH", (req, url) => req.patch(url)],
  ];

  httpMethodTests.forEach(([method, makeReq]) => {
    it(`adds ${method} request to the channel`, async () => {
      const config = makeConfig({ method });

      const redisServiceResponse = {
        id: "temp",
        service: "userservice",
        response: {
          method,
          content: "Everything worked.",
        },
      };

      const result = await doPubSub(
        app,
        config,
        [redisServiceResponse],
        (success, getJson) => {
          method === "GET"
            ? makeReq(request(app.instance), "/users")
                .set("origin", "http://localhost:3000")
                .then((x) => success([x, getJson()]))
            : makeReq(request(app.instance), "/users")
                .send({ hello: "world" })
                .set("origin", "http://localhost:3000")
                .then((x) => success([x, getJson()]));
        }
      );

      const [response, json] = result;
      json.request.headers.origin.should.equal("http://localhost:3000");
      response.status.should.equal(200);
      response.text.should.equal(`${method}: Everything worked.`);
    });
  });
}
