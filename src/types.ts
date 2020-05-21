import { IRouterContext } from "koa-router";
import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  routes: {
    [key: string]: {
      [key in HttpMethods]?: RouteConfig;
    };
  };
  redis?: {
    options?: ClientOpts;
    cleanupInterval?: number;
  };
  modifyRequest?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
  modifyResponse?: (
    ctx: IRouterContext,
    response: any
  ) => Promise<{ handled: boolean }>;
  genericErrors?: boolean;
  logError?: (
    responses: FetchedResponse[],
    request: HttpRequest
  ) => Promise<void>;  
}

/*
  RouteHandler Config
*/
export type RouteConfig = {
  services: {
    [key: string]: ServiceHandlerConfig;
  };
  modifyRequest?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
  modifyResponse?: (
    ctx: IRouterContext,
    response: any
  ) => Promise<{ handled: boolean }>;
  mergeResponses?: (responses: FetchedResponse[]) => Promise<FetchedResponse[]>;
  genericErrors?: boolean;
  logError?: (
    responses: FetchedResponse[],
    request: HttpRequest
  ) => Promise<void>;
};

/*
  Service Configuration
*/
export type ServiceHandlerConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
  modifyServiceResponse?: (
    response: HttpResponse | undefined
  ) => Promise<HttpResponse>;
  logError?: (
    response: HttpResponse | undefined,
    request: HttpRequest
  ) => Promise<void>;
};

export type RedisServiceHandlerConfig = {
  type: "redis";
  config: {
    requestChannel: string;
    responseChannel: string;
    numRequestChannels?: number;
    modifyServiceRequest?: (request: RedisServiceRequest) => Promise<any>;
    modifyRollbackRequest?: (request: RedisServiceRequest) => Promise<any>;
  };
} & ServiceHandlerConfigBase;

export type HttpServiceHandlerConfig = {
  type: "http";
  config: {
    url: string;
    rollbackUrl?: string;
    modifyServiceRequest?: (request: HttpRequest) => Promise<HttpRequest>;
    modifyRollbackRequest?: (request: HttpRequest) => Promise<HttpRequest>;
  };
} & ServiceHandlerConfigBase;

export type ServiceHandlerConfig =
  | RedisServiceHandlerConfig
  | HttpServiceHandlerConfig;

/*
  Currently active requests
*/
export type ActiveRedisRequest = {
  responseChannel: string;
  id: string;
  timeoutTicks: number;
  service: string;
  startTime: number;
  request: HttpRequest;
  onResponse: (response: FetchedResponse) => void;
};

/*
  Output of processMessages()
*/
export type FetchedResponse = {
  type: "http" | "redis";
  id: string;
  service: string;
  time: number;
  path: string;
  method: HttpMethods;
  response?: HttpResponse;
};

/*
  Requests and Responses for Redis-based Services
*/
export type RedisServiceRequest = {
  id: string;
  type: "request" | "rollback";
  responseChannel: string;
  request: HttpRequest;
};

export type RedisServiceResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

/*
  Http Request
*/
export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string;
  };
  body: any;
  headers: {
    [key: string]: string;
  };
};

/*
  Can be used to form an HttpResponse
*/
export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    overwrite?: boolean;
  }[];
  headers?: IncomingHttpHeaders;
  content?: any;
  contentType?: string;
};
