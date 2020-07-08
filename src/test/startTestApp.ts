import { startWithConfiguration } from "..";
import { AppConfig, UserAppConfig } from "../types";
import { createClient } from "redis";
import { promisify } from "util";

export type StartAppParams = {
  port?: number;
  instanceId?: string;
  config: UserAppConfig;
};

export default async function startTestApp(params: StartAppParams) {
  const client = createClient();
  const redisFlushAll = promisify(client.flushdb);
  await redisFlushAll.call(client);

  return await startWithConfiguration(
    typeof params.port !== "undefined"
      ? params.port
      : process.env.TEST_PORT
      ? parseInt(process.env.TEST_PORT)
      : undefined,
    typeof params.instanceId !== "undefined"
      ? params.instanceId
      : undefined,
    params.config
  );
}
