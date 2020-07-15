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
  const result: { [field: string]: string | undefined } = {};

  if (headers) {
    for (const field of Object.keys(headers)) {
      const lcaseField = field.toLowerCase();
      if (lcaseField === "host") {
        result["x-forwarded-host"] = headers[field];
      } else if (lcaseField === "x-forwarded-for") {
        result["x-forwarded-for"] =
          headers["x-forwarded-for"] + `,${headers["host"]}`;
      } else if (lcaseField === "content-type" && contentType) {
        result["content-type"] = contentType;
      } else if (lcaseField === "content-encoding" && encoding) {
        result["content-encoding"] = encoding;
      } else {
        result[field] = headers[field];
      }
    }
    return result;
  }
}
