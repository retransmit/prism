import got, { CancelableRequest } from "got/dist/source";
import { HttpMethods } from "../../types";
import { getResponse } from "./http";
import { Response } from "got/dist/source/core";

export default async function sendParallelRequests(
  url: string,
  method: HttpMethods,
  onResponse: (response: Response<string>) => void,
  count: number,
  parallel: number
) {
  for (let i = 0; i < count; i += parallel) {
    const numRequestsToSend = count - i < parallel ? count - i : parallel;

    const promises: CancelableRequest<Response<string>>[] = [];

    for (let j = 0; j < numRequestsToSend; j++) {
      const promisedResponse = got(url, { method, retry: 0 });
      promises.push(promisedResponse);
    }

    const responses = await Promise.all(promises.map((p) => getResponse(p)));

    for (const serverResponse of responses) {
      onResponse(serverResponse);
    }
  }
}
