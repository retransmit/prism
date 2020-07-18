import { spawn } from "child_process";
import { join } from "path";
import { Readable, Writable } from "stream";

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
  workers?: number;
  eventHandlers?: (stdin: Writable, stdout: Readable, stderr: Readable) => void;
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
    "--cluster",
    "-p",
    port.toString(),
    "-c",
    configFile,
  ];

  if (instanceId) {
    args.push("-i", instanceId);
  }

  if (params.workers) {
    args.push("--workers", params.workers.toString());
  }

  const { pid, stdin, stdout, stderr } = spawn("node", args);

  if (params.eventHandlers) {
    params.eventHandlers(stdin, stdout, stderr);
  }

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
