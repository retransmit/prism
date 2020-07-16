import { HttpRequest, HttpHeaders } from "../../types";
import { Options } from "got/dist/source/core";
import { getHeaderAsString } from "./getHeaderAsString";

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
    headers: mapHeaders(request.headers, encoding, contentType),
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

function mapHeaders(
  headers: HttpHeaders | undefined,
  encoding: string | undefined,
  contentType: string | undefined
): HttpHeaders {
  const result: HttpHeaders = {};

  if (headers) {
    for (const field of Object.keys(headers)) {
      const currentVal = headers[field];
      const lcaseField = field.toLowerCase();
      if (lcaseField === "host") {
        const xForwardedHost = getHeaderAsString(currentVal);
        if (xForwardedHost) {
          result["x-forwarded-host"] = xForwardedHost;
        }
      } else if (lcaseField === "x-forwarded-for") {
        result["x-forwarded-for"] =
          getHeaderAsString(currentVal) + `,${headers["host"]}`;
      } else if (lcaseField === "content-type" && contentType) {
        result["content-type"] = contentType;
      } else if (lcaseField === "content-encoding" && encoding) {
        result["content-encoding"] = encoding;
      } else {
        result[field] = headers[field];
      }
    }
  }
  return result;
}
