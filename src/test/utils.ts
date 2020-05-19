import request = require("supertest");
import { IAppConfig, RedisServiceResponse } from "../types";
import { startWithConfiguration } from "..";
import { createClient } from "redis";

export async function doPubSub(
  app: { instance: any },
  config: IAppConfig,
  serviceResponses: RedisServiceResponse[],
  then: (success: Function, getJson: () => any) => void
): Promise<[request.Response, any]> {
  const service = await startWithConfiguration(undefined, config);
  app.instance = service.listen();

  const subscriber = createClient();
  const publisher = createClient();
  subscriber.subscribe("input");

  return await new Promise<[request.Response, any]>((success) => {
    let json: any;

    subscriber.on("message", (channel, message) => {
      json = JSON.parse(message);
      for (const response of serviceResponses) {
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
