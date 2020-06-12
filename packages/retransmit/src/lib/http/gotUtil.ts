import { HttpRequest } from "../../types";

export function makeGotOptions(request: HttpRequest, timeout?: number) {
  const basicOptions = {
    searchParams: request.query,
    method: request.method,
    headers: request.headers,
    retry: 0,
    timeout,
  };

  const options =
    typeof request.body === "string"
      ? {
          ...basicOptions,
          body: request.body,
        }
      : typeof request.body === "object"
      ? {
          ...basicOptions,
          json: request.body,
        }
      : basicOptions;

  return options;
}
