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
  const redisServiceRequest: RedisServiceRequest = {
    id: requestId,
    type: "rollback",
    request: httpRequest,
  };

  publish(
    redisServiceRequest,
    httpRequest.path,
    httpRequest.method,
    "rollback"
  );
}
