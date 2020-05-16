import "mocha";
import "should";
import request = require("supertest");

import { startApp, startWithConfiguration } from "..";
import { createClient } from "redis";
import { IAppConfig } from "../types";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  if (!process.env.PORT) {
    throw new Error("The port should be specified in process.env.PORT");
  }

  if (!process.env.CONFIG_DIR) {
    throw new Error(
      "The configuration directory should be specified in process.env.CONFIG_DIR"
    );
  }

  const port = parseInt(process.env.PORT);
  const configDir = process.env.CONFIG_DIR;

  describe("dissipate", () => {
    let app: any;

    before(async function resetEverything() {});

    beforeEach(async function resetBeforeEach() {});

    afterEach(async function resetAfterEach() {
      app.close();
    });

    it("posts request to the channel", async () => {
      const config = {
        requestChannel: "input",
        responseChannel: "output",
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {},
              },
            },
          },
        },
      } as IAppConfig;

      const service = await startWithConfiguration(port, config);
      app = service.listen();

      const subscriber = createClient();
      const publisher = createClient();
      subscriber.subscribe("input");

      const result = await new Promise((success) => {
        subscriber.on("message", (channel, message) => {
          const json = JSON.parse(message);
          publisher.publish(
            "output",
            JSON.stringify({
              id: json.id,
              success: true,
              response: {
                content: "Everything worked.",
              },
            })
          );
        });

        const response = request(app)
          .post("/users")
          .send({ hello: "world" })
          .set("Origin", "http://localhost:3000")
          .then((x) => success(x));
      });

      console.log("RESULT", result);
    });
  });
}

run();
