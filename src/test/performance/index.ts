import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import { AppControl } from "../../types";
import { join } from "path";

export type PerformanceTestEnv = {
  appRoot: string;
  testRoot: string;
};

export type PerformanceTestAppInstance = {
  pid?: number;
  appControl?: AppControl;
  mockHttpServers?: (HttpServer | HttpsServer)[];
};

export type PerformanceTestResult = {
  count: number;
  startTime: number;
  endTime: number;
};

export function getAppRoot() {
  return join(__dirname, "../../");
}
