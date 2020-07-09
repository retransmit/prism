import { PeriodicWebJob, AppConfig } from "../../../types";
import got from "got/dist/source";
import selectRandomUrl from "../../../utils/http/selectRandomUrl";

let interval: NodeJS.Timeout | undefined = undefined;

export async function init(
  name: string,
  job: PeriodicWebJob,
  config: AppConfig
) {
  if (interval) {
    clearInterval(interval);
  }
  interval = setIntervalForJob(name, job);
}

function setIntervalForJob(name: string, job: PeriodicWebJob): NodeJS.Timeout {
  return setInterval(() => runWebJob(name, job), job.interval);
}

async function runWebJob(name: string, job: PeriodicWebJob) {
  const url = await selectRandomUrl(job.url, job.getUrl);

  const method = job.method || "GET";

  const options =
    method === "GET" || method === "DELETE" || method === "HEAD"
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
