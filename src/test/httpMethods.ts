import { HttpMethods, IAppConfig, ServiceResult } from "../types";
import request = require("supertest");
import { doPubSub } from "./utils";

export default async function (app: { instance: any }) {
  function makeConfig(options: { method: HttpMethods }): IAppConfig {
    return {
      requestChannel: "input",
      responseChannel: "output",
      routes: {
        "/users": {
          [options.method]: {
            services: {
              userservice: {},
            },
          },
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

      const serviceResult: ServiceResult = {
        id: "temp",
        service: "userservice",
        success: true,
        response: {
          content: "Everything worked.",
        },
      };

      const result = await doPubSub(
        app,
        config,
        [serviceResult],
        (success, getJson) => {
          makeReq(request(app.instance), "/users")
            .send({ hello: "world" })
            .set("origin", "http://localhost:3000")
            .then((x) => success([x, getJson()]));
        }
      );

      const [response, json] = result;
      json.data.headers.origin.should.equal("http://localhost:3000");
      response.text.should.equal("Everything worked.");
    });
  });
}
