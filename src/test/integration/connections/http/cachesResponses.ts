import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../";
import got from "got";
import {
  RedisStateConfig,
  InMemoryStateConfig,
  UserAppConfig,
} from "../../../../types";
import { Response } from "got/dist/source/core";
import { createClient } from "redis";
import { promisify } from "util";
import startTestApp from "../../utils/startTestApp";
import sleep from "../../../../utils/sleep";

const client = createClient();
const redisFlushAll = promisify(client.flushdb);

export default async function (app: TestAppInstance) {
  function makeConfig(modification: (config: UserAppConfig) => UserAppConfig) {
    const baseConfig: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            GET: {
              caching: {
                expiry: 200,
              },
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                },
              },
            },
          },
        },
      },
    };

    return modification(baseConfig);
  }

  const tests: [string, boolean, UserAppConfig][] = [
    [
      "caches in memory",
      false,
      makeConfig((cfg) => {
        cfg.state = {
          type: "memory",
        } as InMemoryStateConfig;
        return cfg;
      }),
    ],
    [
      "caches in redis",
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

      const appControl = await startTestApp({ config });

      let userServiceCallCount = 0;

      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: [
            {
              path: "/users",
              method: "GET",
              handleResponse: async (ctx) => {
                userServiceCallCount++;
                ctx.body = {
                  user: userServiceCallCount * 100,
                };
              },
            },
          ],
        },
      ]);

      app.appControl = appControl;
      app.mockHttpServers = backendApps;

      const { port } = appControl;

      const promisedResponses: Promise<Response<string>>[] = [];

      for (let i = 0; i <= 5; i++) {
        const promisedResponse = got(`http://localhost:${port}/users`, {
          method: "GET",
          retry: 0,
        });
        promisedResponses.push(getResponse(promisedResponse));

        if (i === 0) {
          await sleep(100);
        }

        if (i === 4) {
          await sleep(200);
        }
      }

      const responses = await Promise.all(promisedResponses);

      userServiceCallCount.should.equal(2);

      responses[0].statusCode.should.equal(200);
      JSON.parse(responses[0].body).should.deepEqual({ user: 100 });
      responses[1].statusCode.should.equal(200);
      JSON.parse(responses[1].body).should.deepEqual({ user: 100 });
      responses[5].statusCode.should.equal(200);
      JSON.parse(responses[5].body).should.deepEqual({ user: 200 });
    }).timeout(5000);
  }
}
