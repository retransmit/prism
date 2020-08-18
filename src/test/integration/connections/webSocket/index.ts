import "mocha";
import "should";

import onConnect from "./plugins/onConnect";
import onRequest from "./plugins/onRequest";
import { TestAppInstance } from "..";
import redisBasicRequest from "./plugins/redis/basicRequest";
import { TestEnv } from "../..";

export default function run(app: TestAppInstance, testEnv: TestEnv) {
  describe("websocket connections", () => {
    describe("http", () => {
      onConnect(app, testEnv);
      onRequest(app, testEnv);
    });

    describe("redis", () => {
      redisBasicRequest(app, testEnv);
    });
  });
}
