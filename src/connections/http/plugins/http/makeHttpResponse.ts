import { HttpResponse } from "../../../../types/http";
import { Response } from "got/dist/source/core";
import { isJson } from "./isJson";

export function makeHttpResponse(
  serverResponse: Response<any>
): HttpResponse {
  const headers: { [field: string]: string | string[] | undefined } = {};
  for (const field of Object.keys(serverResponse.headers)) {
    const lcaseField = field.toLowerCase();

    // Skip content encoding for now since we don't handle gzip.
    // Except while using stream - which directly passes through.
    if (lcaseField !== "content-encoding") {
      headers[lcaseField] = serverResponse.headers[field];
    }
  }

  return {
    headers: headers,
    status: serverResponse.statusCode,
    body: isJson(serverResponse)
      ? JSON.parse(serverResponse.body)
      : serverResponse.body,
  };
}
