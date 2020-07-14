import { startWithConfiguration } from "../..";
import { UserAppConfig } from "../../types";
import { createClient } from "redis";
import { promisify } from "util";
import random from "../../utils/random";

export type StartAppParams = {
  port?: number;
  instanceId?: string;
  config: UserAppConfig;
};

export default async function startRetransmitTestInstance(
  params: StartAppParams
) {
  const client = createClient();
  const redisFlushAll = promisify(client.flushdb);
  await redisFlushAll.call(client);

  const port =
    typeof params.port !== "undefined"
      ? params.port
      : process.env.TEST_PORT
      ? parseInt(process.env.TEST_PORT)
      : undefined;

  const instanceId =
    typeof params.instanceId !== "undefined"
      ? params.instanceId
      : `testinstance_${random()}`;

  return await startWithConfiguration(port || 6060, params.config, instanceId, {
    isCluster: false,
    silent: true,
  });
}
