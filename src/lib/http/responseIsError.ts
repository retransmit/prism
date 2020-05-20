import { HttpResponse } from "../../types";

export default function responseIsError(response: HttpResponse | undefined) {
  return response && response.status && response.status >= 400;
}