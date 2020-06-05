import "mocha";
import "should";
import WebSocket from "ws";

import integrationTestsHttp from "./integration/connections/http";
import integrationTestsWebSocket from "./integration/connections/websocket";

import { closeHttpServer, closeWebSocketServer } from "./utils";
import { Server } from "http";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  describe("retransmit", () => {
    let app: {
      servers: {
        httpServer: Server;
        websocketServers: WebSocket.Server[];
      };
    } = { app: { servers: undefined } } as any;

    afterEach(async function resetAfterEach() {
      for (const webSocketServer of app.servers.websocketServers) {
        await closeWebSocketServer(webSocketServer);
      }
      await closeHttpServer(app.servers.httpServer);
    });

    integrationTestsHttp(app);
    integrationTestsWebSocket(app);
  });
}

run();
