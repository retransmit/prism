import { HttpMethods, IAppConfig } from "../../types";
import request = require("supertest");
import Koa = require("koa");
import { startWithConfiguration } from "../..";
import startBackends from "./startBackends";
import { closeServer } from "../utils";

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

      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: ["GET", "POST", "PUT", "DELETE", "PATCH"].map((method) => ({
            path: "/users",
            method,
            response: { body: `${method}: Everything worked.` },
          })),
        },
      ]);

      const response = await makeReq(request(app.instance), "/users")
        .send({ hello: "world" })
        .set("origin", "http://localhost:3000");

      for (const backendApp of backendApps) {
        await closeServer(backendApp as any);
      }

      response.status.should.equal(200);
      response.text.should.equal(`${method}: Everything worked.`);
    });
  });
}
