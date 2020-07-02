import { IAppConfig, WebJob } from "../../types";
import got from "got/dist/source";
import selectRandomUrl from "../../lib/http/selectRandomUrl";

export async function init(config: IAppConfig) {
  if (config.webJobs) {
    for (const job of config.webJobs) {
      setIntervalForJob(job);
    }
  }
}

function setIntervalForJob(job: WebJob) {
  setInterval(() => runWebJob(job), job.interval);
}

async function runWebJob(job: WebJob) {
  const url = await selectRandomUrl(job.url, job.getUrl);

  const method = job.method || "GET";

  const options =
    method === "GET" || method === "DELETE"
      ? {
          method,
          retry: 0,
        }
      : {
          method,
          body: job.body,
          retry: 0,
        };
        
  got(url, options);
}
