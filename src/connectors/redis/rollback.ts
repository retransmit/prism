import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResult,
  ActiveRedisRequest,
  ServiceHandlerConfig,
  RedisRequest,
  HttpRequest,
} from "../../types";

import * as activeRequests from "./activeRequests";
import * as configModule from "../../config";
import { publish } from "./publish";
/*
  Make Promises for Redis Services
*/
export default function rollback(requestId: string, httpRequest: HttpRequest) {
  const redisRequest = {
    id: requestId,
    type: "rollback",
    data: httpRequest,
  };

  publish(redisRequest, httpRequest.path, httpRequest.method);
}
