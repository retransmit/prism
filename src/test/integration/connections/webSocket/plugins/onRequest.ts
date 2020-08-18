import WebSocket from "ws";
import { TestAppInstance } from "../..";
import startRetransmitTestInstance from "../../../../utils/startRetransmitTestInstance";
import { UserAppConfig } from "../../../../../types/config";
import { TestEnv } from "../../..";
import { WebSocketClientRequest } from "../../../../../types/webSocket";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`runs the onRequest hook on root config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const connectedPromise: Promise<void> = new Promise(async (success) => {
      const config: UserAppConfig = {
        webSocket: {
          onRequest: async (request: WebSocketClientRequest) => {
            ran = true;
            receivedMessage = request.message || "";
            success();
            return {
              handled: true,
              response: {
                id: request.id,
                service: "",
                type: "message",
                message: "GOOG:1000.00",
              },
            };
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
    });

    const ws = new WebSocket(`ws://localhost:${app.appControl?.port}/quotes`);

    ws.on("open", () => {
      ws.send("HELO");
    });

    const receivedResponsePromise = new Promise<string>((success) => {
      // Listen for messages
      ws.addEventListener("message", function (event) {
        success(event.data);
      });
    });

    await connectedPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");
    
    const response = await receivedResponsePromise;
    response.should.equal("BLALSA");
  });

  // it(`runs the connect hook on route config`, async () => {
  //   let ran = false;
  //   let receivedMessage = "";

  //   const connectedPromise: Promise<void> = new Promise(async (success) => {
  //     const config: UserAppConfig = {
  //       webSocket: {
  //         routes: {
  //           "/quotes": {
  //             onConnect: async (request: WebSocketClientRequest) => {
  //               ran = true;
  //               receivedMessage = request.message || "";
  //               success();
  //               return { drop: false };
  //             },
  //             services: {
  //               quoteservice: {
  //                 type: "http" as "http",
  //                 url: "http://localhost:6666/quotes",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     };

  //     const appControl = await startRetransmitTestInstance({ config });

  //     app.appControl = appControl;
  //     const { port } = appControl;

  //     const ws = new WebSocket(`ws://localhost:${port}/quotes`);

  //     ws.on("open", () => {
  //       ws.send("HELO");
  //     });
  //   });

  //   const response = await connectedPromise;
  //   ran.should.be.true();
  //   receivedMessage.should.equal("HELO");
  // });
}
