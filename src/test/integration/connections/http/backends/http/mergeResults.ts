import request = require("supertest");
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
  it(`merges responses`, async () => {
    const config = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                },
                messagingservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/messages",
                },
              },
            },
          },
        },
      },
    };

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
        routes: ["GET"].map((method) => ({
          path: "/users",
          method,
          response: {
            body: {
              user: 1,
            },
          },
        })),
      },
      {
        port: 6667,
        routes: ["GET"].map((method) => ({
          path: "/messages",
          method,
          response: {
            body: {
              message: "hello world",
            },
          },
        })),
      },
    ]);

    const response = await request(app.servers.httpServer)
      .get("/users")
      .send({ hello: "world" })
      .set("origin", "http://localhost:3000");

    for (const backendApp of backendApps) {
      await closeHttpServer(backendApp);
    }

    response.status.should.equal(200);
    response.body.should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
