import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResponse,
  ActiveRedisRequest,
  ServiceHandlerConfig,
  RedisServiceRequest,
  HttpRequest,
} from "../../types";

import * as activeRequests from "./activeRequests";
import * as configModule from "../../config";
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
