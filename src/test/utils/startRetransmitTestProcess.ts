import { spawn } from "child_process";
import { join } from "path";
import { Readable } from "stream";

export type InstanceConfig = {
  stdout: Readable;
  stderr: Readable;
  port: number;
  instanceId: string;
  pid: number;
};

export type StartAppParams = {
  port?: number;
  instanceId?: string;
};

export default async function startRetransmitTestProcess(
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

  const args = [
    startUpScript,
    // "--silent",
    "--cluster",
    "-p",
    port.toString(),
    "-c",
    configFile,
  ];

  if (instanceId) {
    args.push("-i", instanceId);
  }

  const { pid, stdout, stderr } = spawn("node", args);

  await new Promise((success) => {
    stdout.on("data", (x: Buffer) => {
      if (x.toString().startsWith("instance")) {
        success();
      }
    });
  });

  return {
    port,
    instanceId: "testinstance",
    pid,
    stdout,
    stderr,
  };
}
