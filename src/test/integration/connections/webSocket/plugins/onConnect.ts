import WebSocket from "ws";
import { TestAppInstance } from "../..";
import startRetransmitTestInstance from "../../../../utils/startRetransmitTestInstance";
import { UserAppConfig } from "../../../../../types/config";
import { TestEnv } from "../../..";
import { WebSocketClientRequest } from "../../../../../types/webSocket";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`runs the connect hook on root config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const connectedPromise: Promise<void> = new Promise(async (success) => {
      const config: UserAppConfig = {
        webSocket: {
          onConnect: async (request: WebSocketClientRequest) => {
            ran = true;
            receivedMessage = request.message || "";
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

      const appControl = await startRetransmitTestInstance({ config });

      app.appControl = appControl;
      const { port } = appControl;

      const ws = new WebSocket(`ws://localhost:${port}/quotes`);

      ws.on("open", () => {
        ws.send("HELO");
      });
    });

    const response = await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");
  });

  it(`runs the connect hook on route config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const connectedPromise: Promise<void> = new Promise(async (success) => {
      const config: UserAppConfig = {
        webSocket: {
          routes: {
            "/quotes": {
              onConnect: async (request: WebSocketClientRequest) => {
                ran = true;
                receivedMessage = request.message || "";
                success();
                return { drop: false };
              },
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

      const appControl = await startRetransmitTestInstance({ config });

      app.appControl = appControl;
      const { port } = appControl;

      const ws = new WebSocket(`ws://localhost:${port}/quotes`);

      ws.on("open", () => {
        ws.send("HELO");
      });
    });

    const response = await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");
  });

  it(`runs the connect hook on root config and drops`, async () => {
    let ran = false;
    let receivedMessage = "";
    let clientResponse = "";

    const connectedPromise: Promise<void> = new Promise(async (success) => {
      const config: UserAppConfig = {
        webSocket: {
          onConnect: async (request: WebSocketClientRequest) => {
            ran = true;
            receivedMessage = request.message || "";
            return { drop: true, message: "NOPE" };
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

      const appControl = await startRetransmitTestInstance({ config });
      app.appControl = appControl;
      const { port } = appControl;

      const ws = new WebSocket(`ws://localhost:${port}/quotes`);

      ws.on("open", () => {
        ws.send("HELO");
      });

      ws.on("message", (msg: string) => {
        clientResponse = msg;
      });

      ws.on("close", () => {
        success();
      });
    });

    const response = await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");
    clientResponse.should.equal("NOPE");
  });

  it(`runs the connect hook on route config and drops`, async () => {
    let ran = false;
    let receivedMessage = "";
    let clientResponse = "";

    const connectedPromise: Promise<void> = new Promise(async (success) => {
      const config: UserAppConfig = {
        webSocket: {
          routes: {
            "/quotes": {
              onConnect: async (request: WebSocketClientRequest) => {
                ran = true;
                receivedMessage = request.message || "";
                return { drop: true, message: "NOPE" };
              },
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

      const appControl = await startRetransmitTestInstance({ config });
      app.appControl = appControl;
      const { port } = appControl;

      const ws = new WebSocket(`ws://localhost:${port}/quotes`);

      ws.on("open", () => {
        ws.send("HELO");
      });

      ws.on("message", (msg: string) => {
        clientResponse = msg;
      });

      ws.on("close", () => {
        success();
      });
    });

    const response = await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");
    clientResponse.should.equal("NOPE");
  });
}
