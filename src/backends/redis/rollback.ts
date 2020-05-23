import { HttpRequest } from "../../types";

import { publish } from "./publish";
/*
  Make Promises for Redis Services
*/
export default async function rollback(
  requestId: string,
  httpRequest: HttpRequest
) {
  publish(requestId, httpRequest, "rollback");
}
