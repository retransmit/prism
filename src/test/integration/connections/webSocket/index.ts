import "mocha";
import "should";

import onConnect from "./plugins/onConnect";
import { TestAppInstance } from "../";
import redisBasicRequest from "./plugins/redis/basicRequest";

export default function run(app: TestAppInstance) {
  describe("websocket connections", () => {
    describe("http", () => {
      onConnect(app);
    });

    describe("redis", () => {
      redisBasicRequest(app);
    });
  });
}
