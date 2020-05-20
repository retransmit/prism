import { HttpResponse } from "../../types";
import { Response } from "got/dist/source/core";
import { isJson } from "./isJson";

export function makeHttpResponse(
  serverResponse: Response<string> | undefined
): HttpResponse | undefined {
  return serverResponse
    ? {
        headers: serverResponse.headers,
        status: serverResponse.statusCode,
        content: isJson(serverResponse)
          ? JSON.parse(serverResponse.body)
          : serverResponse.body,
      }
    : undefined;
}
