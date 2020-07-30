import { HttpResponse } from "../../types/http";

export default function responseIsError(response: HttpResponse | undefined) {
  return response && response.status && response.status >= 400;
}