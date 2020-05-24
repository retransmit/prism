import { IRouterContext } from "koa-router";
import * as configModule from "../../config";
import { HttpMethods } from "../../types";
import randomId from "../../lib/random";
// import invokeHttpServices from "./backends/http/invokeServices";
// import rollbackHttp from "./backends/http/rollback";
// import invokeRedisServices from "./backends/redis/invokeServices";
// import rollbackRedis from "./backends/redis/rollback";
// import mergeResponses from "./mergeResponses";
import responseIsError from "../../lib/http/responseIsError";
import HttpRequestContext from "./RequestContext";
import {
  FetchedHttpResponse,
  InvokeServiceResult,
} from "../../types/httpRequests";
import WebSocketRequestContext from "./RequestContext";

// const connectors = [
//   { type: "http", invokeServices: invokeHttpServices, rollback: rollbackHttp },
//   {
//     type: "redis",
//     invokeServices: invokeRedisServices,
//     rollback: rollbackRedis,
//   },
// ];

/*
  Make an HTTP request handler
*/
export default function createHandler() {
  return async function websocketHandler(ctx: IRouterContext) {
    return await handler(new WebSocketRequestContext(ctx));
  };
}

async function handler(ctx: WebSocketRequestContext) {
  const config = configModule.get();
  const requestId = randomId(32);
}
