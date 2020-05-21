import request = require("supertest");
import { startWithConfiguration } from "../../..";
import startBackends from "./startBackends";
import { closeServer } from "../../utils";

export default async function (app: { instance: any }) {
  it(`must not overwrite json content with string content`, async () => {
    const config = {
      routes: {
        "/users": {
          GET: {
            services: {
              userservice: {
                type: "http" as "http",
                config: {
                  url: "http://localhost:6666/users",
                },
              },
              messagingservice: {
                type: "http" as "http",
                config: {
                  url: "http://localhost:6667/messages",
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
          response: { body: "hello world" },
        })),
      },
    ]);

    const response = await request(app.instance)
      .get("/users")
      .send({ hello: "world" })
      .set("origin", "http://localhost:3000");

    for (const backendApp of backendApps) {
      await closeServer(backendApp as any);
    }

    response.status.should.equal(500);
    response.text.should.equal(
      "messagingservice returned a response which will overwrite current response."
    );
  });
}
