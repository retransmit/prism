import got from "got/dist/source";
import selectRandomUrl from "../utils/http/selectRandomUrl";
import { AppConfig } from "../types";
import { PeriodicWebJob } from "../types/webJob";

export function init(
  name: string,
  job: PeriodicWebJob,
  config: AppConfig
): NodeJS.Timeout {
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
