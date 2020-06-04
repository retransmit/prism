import request = require("supertest");
import { startWithConfiguration } from "../../../../../..";
import random from "../../../../../../lib/random";
import { Server } from "http";
import WebSocket from "ws";

export default async function (app: {
  servers: {
    httpServer: Server;
    websocketServers: WebSocket.Server[];
  };
}) {
  it(`runs the connect hook on root config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const connectedPromise = new Promise(async (success) => {
      const config = {
        instanceId: random(),
        webSocket: {
          onConnect: async (requestId: string, message: string) => {
            ran = true;
            receivedMessage = message;
            success();
            return { drop: false };
          },
          routes: {
            "/quotes": {
              services: {
                quoteservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/quotes",
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

      const ws = new WebSocket(
        `ws://localhost:${
          (app.servers.httpServer.address() as any).port
        }/quotes`
      );
      ws.on("open", () => {
        ws.send("HELLO");
      });
    });

    const response = await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELLO");
  });
}
