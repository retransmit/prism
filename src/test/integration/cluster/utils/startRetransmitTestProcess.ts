import { spawn } from "child_process";
import { TestEnv } from "../../../test";
import { join } from "path";

export type InstanceConfig = {
  port: number;
  instanceId: string;
  pid: number;
};

export type StartAppParams = {
  port?: number;
  instanceId?: string;
};

export async function startRetransmitTestProcess(
  appRoot: string,
  configFile: string,
  params: StartAppParams
): Promise<InstanceConfig> {
  const port: number =
    typeof params.port !== "undefined"
      ? params.port
      : process.env.TEST_PORT
      ? parseInt(process.env.TEST_PORT)
      : 6060;

  const instanceId =
    typeof params.instanceId !== "undefined"
      ? params.instanceId
      : "testinstance";

  const startUpScript = join(appRoot, "index.js");

  const args = [startUpScript, "-p", port.toString(), "-c", configFile];

  if (instanceId) {
    args.push("-1", instanceId);
  }

  const { pid } = spawn("node", args);

  return {
    port,
    instanceId: "testinstance",
    pid,
  };
}
