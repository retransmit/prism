import { HttpMethods, IAppConfig } from "../../types";
import request = require("supertest");
import Koa = require("koa");
import { startWithConfiguration } from "../..";

export default async function (app: { instance: any }) {
  function makeConfig(options: { method: HttpMethods }): IAppConfig {
    return {
      routes: {
        "/users": {
          [options.method]: {
            services: {
              userservice: {
                type: "http" as "http",
                config: {
                  url: "http://localhost:6666/users",
                },
              },
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

      const service = await startWithConfiguration(undefined, config);
      app.instance = service.listen();

      const result = await makeReq(request(app.instance), "/users")
        .send({ hello: "world" })
        .set("origin", "http://localhost:3000");

      result.status.should.equal(200);
      result.text.should.equal("Everything worked.");
    });
  });
}
