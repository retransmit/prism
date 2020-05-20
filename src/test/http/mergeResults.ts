import request = require("supertest");
import { startWithConfiguration } from "../..";
import startBackends from "./startBackends";
import { closeServer } from "../utils";

export default async function (app: { instance: any }) {
  it(`merges responses`, async () => {
    const config = {
      routes: {
        "/users": {
          GET: {
            services: {
              userservice: {
                type: "http" as "http",
                config: {
                  path: "http://localhost:6666/users",
                },
              },
              messagingservice: {
                type: "http" as "http",
                config: {
                  path: "http://localhost:6667/messages",
                },
              },
            },
          },
        },
      },
    };

    const service = await startWithConfiguration(undefined, config);
    app.instance = service.listen();

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: ["GET"].map((method) => ({
          path: "/users",
          method,
          response: {
            user: 1,
          },
        })),
      },
      {
        port: 6667,
        routes: ["GET"].map((method) => ({
          path: "/messages",
          method,
          response: {
            message: "hello world",
          },
        })),
      },
    ]);

    const result = await request(app.instance)
      .get("/users")
      .send({ hello: "world" })
      .set("origin", "http://localhost:3000");

    for (const backendApp of backendApps) {
      await closeServer(backendApp as any);
    }

    result.status.should.equal(200);
    result.body.should.deepEqual({
      user: 1,
      message: "hello world",
    });
  });
}
