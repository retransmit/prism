import { IAppConfig, WebJob } from "../../types";
import got from "got/dist/source";
import selectRandomUrl from "../../utils/http/selectRandomUrl";

export async function init(config: IAppConfig) {
  if (config.webJobs) {
    for (const name of Object.keys(config.webJobs)) {
      setIntervalForJob(name, config.webJobs[name]);
    }
  }
}

function setIntervalForJob(name: string, job: WebJob) {
  setInterval(() => runWebJob(name, job), job.interval);
}

async function runWebJob(name: string, job: WebJob) {
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

  got(url, options).catch(() => {
    // TODO write to error log.
  });
}
