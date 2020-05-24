import { HttpResponse, HttpRequest, HttpMethods } from ".";
import HttpRequestContext from "../requestHandlers/http/RequestContext";
import { InvokeServiceResult } from "../handler";

/*
  RouteHandler Config
*/
export type RouteConfig = {
  services: {
    [key: string]: HttpHandlerConfig;
  };
  onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
  onResponse?: (
    ctx: HttpRequestContext,
    response: any
  ) => Promise<{ handled: boolean }>;
  mergeResponses?: (
    responses: FetchedHttpResponse[]
  ) => Promise<FetchedHttpResponse[]>;
  genericErrors?: boolean;
  onError?: (
    responses: FetchedHttpResponse[],
    request: HttpRequest
  ) => Promise<void>;
};

/*
  Currently active requests
*/
export type ActiveRedisHttpRequest = {
  // keepAlive: boolean;
  responseChannel: string;
  id: string;
  timeoutAt: number;
  service: string;
  startTime: number;
  request: HttpRequest;
  onResponse: (result: InvokeServiceResult) => void;
};

/*
  Output of processMessages()
*/
export type FetchedHttpResponse = {
  type: "http" | "redis";
  id: string;
  service: string;
  time: number;
  path: string;
  method: HttpMethods;
  response?: HttpResponse;
};

/*
  Http Requests and Responses for Redis-based Services
*/
export type RedisServiceHttpRequest = {
  id: string;
  type: string;
  responseChannel: string;
  request: HttpRequest;
};

export type RedisServiceHttpResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

/*
  Service Configuration
*/
export type HttpHandlerConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
  onResponse?: (response: HttpResponse | undefined) => Promise<HttpResponse>;
  onError?: (
    response: HttpResponse | undefined,
    request: HttpRequest
  ) => Promise<void>;
};

export type RedisServiceHttpHandlerConfig = {
  type: "redis";
  config: {
    requestChannel: string;
    responseChannel: string;
    numRequestChannels?: number;
    onRequest?: (
      request: RedisServiceHttpRequest
    ) => Promise<
      | {
          handled: true;
          response: HttpResponse;
        }
      | { handled: false; request: RedisServiceHttpRequest }
    >;
    onRollbackRequest?: (
      request: RedisServiceHttpRequest
    ) => Promise<
      | {
          handled: true;
        }
      | { handled: false; request: RedisServiceHttpRequest }
    >;
  };
} & HttpHandlerConfigBase;

export type HttpServiceHttpHandlerConfig = {
  type: "http";
  config: {
    url: string;
    rollbackUrl?: string;
    onRequest?: (
      request: HttpRequest
    ) => Promise<
      | {
          handled: true;
          response: HttpResponse;
        }
      | { handled: false; request: HttpRequest }
    >;
    onRollbackRequest?: (
      request: HttpRequest
    ) => Promise<
      | {
          handled: true;
        }
      | { handled: false; request: HttpRequest }
    >;
  };
} & HttpHandlerConfigBase;

export type HttpHandlerConfig =
  | RedisServiceHttpHandlerConfig
  | HttpServiceHttpHandlerConfig;
