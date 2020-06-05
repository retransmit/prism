import "mocha";
import "should";
import { Server } from "http";
import WebSocket from "ws";

import onConnect from "./backends/onConnect";

export default function run(app: {
  servers: {
    httpServer: Server;
    websocketServers: WebSocket.Server[];
  };
}) {
  describe("WebSocket connections (integration)", () => {
    describe("http", () => {      
      onConnect(app);
    });

    // describe("redis", () => {
    //   afterEach(async function resetAfterEach() {
    //     await closeServer(app.servers.httpServer);
    //   });
    //   redisHttpMethods(app);
    //   redisMergeResults(app);
    //   redisDontMergeIgnored(app);
    //   redisShowGenericErrors(app);
    //   redisMustNotOverwriteJsonWithString(app);
    //   redisRollsback(app);
    // });
  });
}
