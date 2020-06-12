import "mocha";
import "should";

import onConnect from "./plugins/onConnect";
import { TestAppInstance } from "../../../test";
import redisSendToClient from "./plugins/redis/sendToClient";

export default function run(app: TestAppInstance) {
  describe("WebSocket connections (integration)", () => {
    describe("http", () => {
      onConnect(app);
    });

    describe("redis", () => {
      redisSendToClient(app);
    });
  });
}
