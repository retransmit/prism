import { HttpResponse } from "./types";

export function hasErrors(response: HttpResponse | undefined) {
  return response && response.status && response.status >= 400;
}
