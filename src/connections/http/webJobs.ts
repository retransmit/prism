import { IAppConfig, WebJob } from "../../types";

export async function init(config: IAppConfig) {
  if (config.webJobs) {
    for (const job of config.webJobs) {
      (function (job: WebJob) {
        setTimeout(() => runWebJob(job), job.interval);
      })(job);
    }
  }
}

async function runWebJob(job: WebJob) {
  
}
