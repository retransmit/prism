import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../lib/random";
import got from "got";
import {
  IAppConfig,
  RedisStateConfig,
  InMemoryStateConfig,
} from "../../../../types";
import { Response } from "got/dist/source/core";
import { createClient } from "redis";
import { promisify } from "util";

const client = createClient();
const redisFlushAll = promisify(client.flushdb);

function sleep(ms: number): Promise<void> {
  return new Promise((success) => {
    setTimeout(success, ms);
  });
}

export default async function (app: TestAppInstance) {
  function makeConfig(modification: (config: IAppConfig) => IAppConfig) {
    const baseConfig: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                },
              },
            },
          },
        },
        rateLimiting: {
          type: "ip",
          maxRequests: 4,
          duration: 150,
        },
      },
    };

    return modification(baseConfig);
  }

  const tests: [string, boolean, IAppConfig][] = [
    [
      "rate limits with in-memory state",
      false,
      makeConfig((cfg) => {
        cfg.state = {
          type: "memory",
        } as InMemoryStateConfig;
        return cfg;
      }),
    ],
    [
      "rate limits with redis state",
      true,
      makeConfig((cfg) => {
        cfg.state = {
          type: "redis",
        } as RedisStateConfig;
        return cfg;
      }),
    ],
  ];

  for (const [name, isRedis, config] of tests) {
    it(name, async () => {
      if (isRedis) {
        const client = createClient();
        await redisFlushAll.call(client);
        await sleep(100);
      }

      const servers = await startWithConfiguration(
        undefined,
        "testinstance",
        config
      );

      const callCount = 0;
      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: [
            {
              path: "/users",
              method: "GET",
              handleResponse: async (ctx) => {
                ctx.body = "hello, world";
              },
            },
          ],
        },
      ]);

      app.servers = {
        ...servers,
        mockHttpServers: backendApps,
      };

      const { port } = app.servers.httpServer.address() as any;

      const promisedResponses: Promise<Response<string>>[] = [];

      for (let i = 0; i <= 5; i++) {
        const promisedResponse = got(`http://localhost:${port}/users`, {
          method: "GET",
          retry: 0,
        });
        promisedResponses.push(getResponse(promisedResponse));

        if (i < 3 && isRedis) {
          await sleep(10);
        }

        if (i === 3 && isRedis) {
          await sleep(50);
        }

        if (i === 4) {
          await sleep(200);
        }
      }

      const responses = await Promise.all(promisedResponses);

      responses[0].statusCode.should.equal(200);
      responses[0].body.should.equal("hello, world");
      responses[3].statusCode.should.equal(200);
      responses[3].body.should.equal("hello, world");
      responses[4].statusCode.should.equal(429);
      responses[4].body.should.equal("Too Many Requests.");
      responses[5].statusCode.should.equal(200);
      responses[5].body.should.equal("hello, world");
    }).timeout(5000);
  }
}
