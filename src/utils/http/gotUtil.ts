import { HttpRequest, HttpHeaders } from "../../types/http";
import { getHeaderAsString } from "./getHeaderAsString";
import { OptionsOfUnknownResponseBody, Options } from "got/dist/source";

// TODO - I am not sure about using OptionsOfUnknownResponseBody
// Check this discussion - https://github.com/sindresorhus/got/issues/954
export function makeGotOptions(
  request: HttpRequest,
  encoding: string | undefined,
  contentType: string | undefined,
  timeout?: number
): OptionsOfUnknownResponseBody {
  const basicOptions = {
    searchParams: request.query,
    method: request.method,
    headers: mapHeaders(request.headers, encoding, contentType),
    followRedirect: false,
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
