import { HttpResponse } from "./types";

export function isHttpError(response: HttpResponse | undefined) {
  return response && response.status && response.status >= 400;
}
