import request = require("supertest");
import { IAppConfig } from "../../../types";
import { startWithConfiguration } from "../../..";
import { createClient } from "redis";
import { RedisServiceHttpResponse } from "../../../types/httpRequests";

export async function doPubSub(
  app: { instance: any },
  config: IAppConfig,
  serviceResponses: RedisServiceHttpResponse[],
  then: (success: Function, getJson: () => any) => void
): Promise<[request.Response, any]> {
  const server = await startWithConfiguration(undefined, config);
  app.instance = server;

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
          "output",
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
