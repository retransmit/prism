import "mocha";
import "should";

import onConnect from "./plugins/onConnect";
import { TestAppInstance } from "../../";
import redisSendToClient from "./plugins/redis/handleRequest";

export default function run(app: TestAppInstance) {
  describe("websocket connections", () => {
    describe("http", () => {
      onConnect(app);
    });

    describe("redis", () => {
      redisSendToClient(app);
    });
  });
}
