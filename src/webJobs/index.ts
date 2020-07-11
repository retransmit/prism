import { init as periodicJobInit } from "./interval";
import { AppConfig } from "../types";

const intervals: NodeJS.Timeout[] = [];

export async function init(config: AppConfig) {
  for (const interval of intervals) {
    clearInterval(interval);
  }

  if (config.webJobs) {
    for (const name of Object.keys(config.webJobs)) {
      const job = config.webJobs[name];
      if (job.type === "periodic") {
        const interval = periodicJobInit(name, job, config);
        intervals.push(interval);
      }
    }
  }
}
