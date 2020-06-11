import WebSocket from "ws";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import { startWithConfiguration } from "../../../../../..";
import { createClient } from "redis";
import { RedisServiceWebSocketConnectRequest } from "../../../../../../types/webSocketRequests";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`gets websocket responses from redis backends`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      webSocket: {
        routes: {
          "/quotes": {
            services: {
              quoteservice: {
                type: "redis" as "redis",
                requestChannel: "input",
              },
            },
          },
        },
        redis: {
          responseChannel: "output",
        },
      },
    };

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );
    app.servers = servers;

    const promisedConnectRequest = new Promise<
      RedisServiceWebSocketConnectRequest
    >((success) => {
      const subscriber = createClient();
      subscriber.subscribe("input");
      subscriber.on("message", (channel, messageString) => {
        const message = JSON.parse(messageString);
        if (message.type === "connect") {
          success(message);
        }
      });
    });

    const ws = new WebSocket(
      `ws://localhost:${(app.servers.httpServer.address() as any).port}/quotes`
    );

    ws.on("open", () => {
      ws.send("HELO");
    });

    const connectRequest: RedisServiceWebSocketConnectRequest = await promisedConnectRequest;

    const publisher = createClient();

    publisher.publish(
      connectRequest.responseChannel,
      JSON.stringify({
        id: connectRequest.id,
        service: "quoteservice",
        route: "/quotes",
        response: "GOOG: 1425.1",
      })
      );
      
      publisher.publish(
        connectRequest.responseChannel,
        JSON.stringify({
          id: connectRequest.id,
          service: "quoteservice",
          route: "/quotes",
        response: "AAPL: 331.8",
      })
    );

    const promisedWSResponses = new Promise<string[]>((success) => {
      const responses: string[] = [];
      ws.on("message", (message: string) => {
        responses.push(message);
        if (responses.length === 2) {
          success(responses);
        }
      });
    });

    const responses = await promisedWSResponses;
    responses.should.deepEqual(["GOOG: 1425.1", "AAPL: 331.8"]);
  });
}
