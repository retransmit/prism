import { PeriodicWebJob, AppConfig } from "../../../types";
import got from "got/dist/source";
import selectRandomUrl from "../../../utils/http/selectRandomUrl";

export async function init(
  name: string,
  job: PeriodicWebJob,
  config: AppConfig
) {
  setIntervalForJob(name, job);
}

function setIntervalForJob(name: string, job: PeriodicWebJob) {
  setInterval(() => runWebJob(name, job), job.interval);
}

async function runWebJob(name: string, job: PeriodicWebJob) {
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
