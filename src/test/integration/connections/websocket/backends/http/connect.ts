import request = require("supertest");
import { startWithConfiguration } from "../../../../../..";
import startBackends from "./startBackends";
import { closeServer } from "../../../../../utils";
import { Server } from "net";
import random from "../../../../../../lib/random";
import WebSocket from "ws";

export default async function (app: { instance: any }) {
  it(`runs the connect hook`, async () => {
    const config = {
      instanceId: random(),
      websocket: {
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

    const server = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );
    app.instance = server;

    const ws = new WebSocket("ws://localhost:3000/quotes");
    ws.on("open", () => {
      ws.send("hello");
    });

    const receivedResponse = new Promise((success) => {
      ws.on("message", success);
    });

    const response = await receivedResponse;
    console.log(response);
  });
}
