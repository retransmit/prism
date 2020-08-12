import { IncomingHttpHeaders } from "http2";
import { HttpProxyAppConfig } from "./config";
import { HttpServiceEndPointConfig, InvokeHttpServiceResult, HttpRouteConfig } from "./config/httpProxy";
import { IRouterContext } from "koa-router";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

// Http Requests and Responses
export type HttpRequestBodyObject = {
  [field: string]: any;
};

export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string;
  };
  body?: string | Buffer | HttpRequestBodyObject | Array<any> | undefined;
  headers?: HttpHeaders;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type HttpHeaders = {
  [key: string]: string | string[];
};

export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: HttpCookie[];
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | HttpRequestBodyObject | Array<any> | undefined;
  contentType?: string;
};

export type HttpCookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  overwrite?: boolean;
};

// Http Requests and Responses for Redis-based Services
export type RedisHttpRequest =
  | {
      type: "request";
      id: string;
      request: HttpRequest;
      responseChannel: string;
    }
  | {
      id: string;
      request: HttpRequest;
      type: "rollback";
    };

export type RedisHttpResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

// Output of processMessage()
export type FetchedHttpResponse = {
  type: "http" | "redis";
  id: string;
  service: string;
  time: number;
  route: string;
  path: string;
  method: HttpMethods;
  response: HttpResponse;
  stage: number | undefined;
};

export type HttpServicePlugin = {
  init: (config: HttpProxyAppConfig) => any;
  handleRequest: (
    requestId: string,
    request: HttpRequest,
    route: string,
    method: HttpMethods,
    stage: number | undefined,
    fetchedResponses: FetchedHttpResponse[],
    services: {
      [name: string]: HttpServiceEndPointConfig;
    },
    routeConfig: HttpRouteConfig,
    config: HttpProxyAppConfig
  ) => Promise<InvokeHttpServiceResult>[];
  handleStreamRequest: (
    ctx: IRouterContext,
    requestId: string,
    request: HttpRequest,
    route: string,
    method: HttpMethods,
    serviceConfig: HttpServiceEndPointConfig,
    routeConfig: HttpRouteConfig,
    config: HttpProxyAppConfig
  ) => Promise<void>;
  rollback: (
    requestId: string,
    request: HttpRequest,
    route: string,
    method: HttpMethods,
    config: HttpProxyAppConfig
  ) => void;
};
