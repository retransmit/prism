import { HttpMethods, IAppConfig } from "../../../../../../types";
import request = require("supertest");
import Koa = require("koa");
import { startWithConfiguration } from "../../../../../..";
import startBackends from "./startBackends";
import { closeHttpServer } from "../../../../../utils";
import random from "../../../../../../lib/random";
import { Server } from "http";
import WebSocket from "ws";

export default async function (app: {
  servers: {
    httpServer: Server;
    websocketServers: WebSocket.Server[];
  };
}) {
  function makeConfig(options: { method: HttpMethods }): IAppConfig {
    return {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            [options.method]: {
              services: {
                userservice: {
                  type: "http" as "http",
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

      const servers = await startWithConfiguration(
        undefined,
        "testinstance",
        config
      );
      app.servers = servers;

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

      const response =
        method === "GET"
          ? await makeReq(request(app.servers.httpServer), "/users").set(
              "origin",
              "http://localhost:3000"
            )
          : await makeReq(request(app.servers.httpServer), "/users")
              .send({ hello: "world" })
              .set("origin", "http://localhost:3000");

      for (const backendApp of backendApps) {
        await closeHttpServer(backendApp);
      }

      response.status.should.equal(200);
      response.text.should.equal(`${method}: Everything worked.`);
    });
  });
}
