import { HttpRequest } from "../../types";
import { Options } from "got/dist/source/core";

export function makeGotOptions(
  request: HttpRequest,
  encoding: string | undefined,
  contentType: string | undefined,
  timeout?: number,
  isStream: boolean = false
): Options {
  const basicOptions = {
    searchParams: request.query,
    method: request.method,
    headers: attachHeaders(request.headers, encoding, contentType),
    followRedirect: false,
    retry: 0,
    timeout,
  };

  const options = isStream
    ? {
        isStream: true,
        ...basicOptions,
      }
    : typeof request.body === "string"
    ? {
        ...basicOptions,
        body: request.body,
      }
    : typeof request.body === "object"
    ? encoding?.includes("application/x-www-form-urlencoded")
      ? {
          ...basicOptions,
          form: request.body,
        }
      : {
          ...basicOptions,
          json: request.body,
        }
    : basicOptions;

  return options;
}

function attachHeaders(
  headers: { [field: string]: string } | undefined,
  encoding: string | undefined,
  contentType: string | undefined
) {
  return headers
    ? Object.keys(headers).reduce((acc, field) => {
        if (field.toLowerCase() === "content-type" && contentType) {
          acc[field] = contentType;
        } else if (field.toLowerCase() === "content-encoding" && encoding) {
          acc[field] = encoding;
        } else {
          acc[field] = headers[field];
        }
        return acc;
      }, {} as { [field: string]: string })
    : {};
}
