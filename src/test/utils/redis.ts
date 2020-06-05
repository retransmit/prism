import request = require("supertest");
import { IAppConfig } from "../../types";
import { startWithConfiguration } from "../../";
import { createClient } from "redis";
import { RedisServiceHttpResponse } from "../../types/httpRequests";
import { Server } from "http";
import WebSocket from "ws";

export async function doPubSub(
  app: {
    servers: {
      httpServer: Server;
      websocketServers: WebSocket.Server[];
    };
  },
  config: IAppConfig,
  serviceResponses: RedisServiceHttpResponse[],
  then: (success: Function, getJson: () => any) => void
): Promise<[request.Response, any]> {
  const servers = await startWithConfiguration(
    undefined,
    "testinstance",
    config
  );

  app.servers = servers;

  const subscriber = createClient();
  const publisher = createClient();
  subscriber.subscribe("input");

  return await new Promise<[request.Response, any]>((success) => {
    let json: any;

    subscriber.on("message", (channel, message) => {
      json = JSON.parse(message);
      for (const staticResponse of serviceResponses) {
        const response = {
          ...staticResponse,
          response: {
            ...staticResponse.response,
            content:
              typeof staticResponse.response.content === "string"
                ? `${json.request.method}: ${staticResponse.response.content}`
                : staticResponse.response.content,
          },
        };
        publisher.publish(
          `output.${config.instanceId}`,
          JSON.stringify({
            ...response,
            id: json.id,
          })
        );
      }
    });

    then(success, () => json);
  });
}
