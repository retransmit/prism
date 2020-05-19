import {
  HttpMethods,
  RouteConfig,
  IAppConfig,
  FetchedResult,
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
export default function rollback(requestId: string, httpRequest: HttpRequest) {
  const redisServiceRequest: RedisServiceRequest = {
    id: requestId,
    type: "rollback",
    data: httpRequest,
  };

  publish(redisServiceRequest, httpRequest.path, httpRequest.method);
}
