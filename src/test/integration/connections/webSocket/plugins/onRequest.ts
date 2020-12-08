import WebSocket from "ws";
import { TestAppInstance } from "../..";
import startRetransmitTestInstance from "../../../../utils/startRetransmitTestInstance";
import { UserAppConfig } from "../../../../../types/config";
import { TestEnv } from "../../..";
import { WebSocketClientRequest } from "../../../../../types/webSocket";
import promiseSignal from "../../../../../lib/promiseSignal";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`runs the onRequest hook on root config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const {
      promise: onRequestPromise,
      resolve: onRequestResolve,
    } = promiseSignal<void>();

    const config: UserAppConfig = {
      webSocket: {
        onRequest: async (request: WebSocketClientRequest) => {
          ran = true;
          receivedMessage = request.message || "";
          onRequestResolve();
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

    const ws = new WebSocket(`ws://localhost:${app.appControl?.port}/quotes`);

    ws.on("open", () => {
      ws.send("HELO");
    });

    const {
      promise: onDataReceivedPromise,
      resolve: onDataReceivedResolve,
    } = promiseSignal<string>();

    ws.addEventListener("message", function (event) {
      onDataReceivedResolve(event.data);
    });

    await onRequestPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");

    const response = await onDataReceivedPromise;
    response.should.equal("GOOG:1000.00");
  });

  it(`runs the onRequest hook on route config`, async () => {
    let ran = false;
    let receivedMessage = "";

    const {
      promise: onRequestPromise,
      resolve: onRequestResolve,
    } = promiseSignal<void>();

    const config: UserAppConfig = {
      webSocket: {
        routes: {
          "/quotes": {
            onRequest: async (request: WebSocketClientRequest) => {
              ran = true;
              receivedMessage = request.message || "";
              onRequestResolve();
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

    const ws = new WebSocket(`ws://localhost:${app.appControl?.port}/quotes`);

    ws.on("open", () => {
      ws.send("HELO");
    });

    const {
      promise: onDataReceivedPromise,
      resolve: onDataReceivedResolve,
    } = promiseSignal<string>();

    ws.addEventListener("message", function (event) {
      onDataReceivedResolve(event.data);
    });

    await onRequestPromise;
    ran.should.be.true();
    receivedMessage.should.equal("HELO");

    const response = await onDataReceivedPromise;
    response.should.equal("GOOG:1000.00");
  });
}
