import { HttpResponse, HttpRequest, HttpMethods } from ".";
import HttpRequestContext from "../requestHandlers/http/RequestContext";

/*
  RouteHandler Config
*/
export type HttpRouteConfig = {
  services: {
    [key: string]: HttpHandlerConfig;
  };
  onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
  onResponse?: (
    ctx: HttpRequestContext,
    response: any
  ) => Promise<{ handled: boolean }>;
  mergeResponses?: (
    responses: FetchedHttpHandlerResponse[]
  ) => Promise<FetchedHttpHandlerResponse[]>;
  genericErrors?: boolean;
  onError?: (
    responses: FetchedHttpHandlerResponse[],
    request: HttpRequest
  ) => Promise<void>;
};

/*
  Result of Service Invocation
*/
export type InvokeServiceResult =
  | { skip: true }
  | { skip: false; response: FetchedHttpHandlerResponse };

/*
  Output of processMessage()
*/
export type FetchedHttpHandlerResponse = {
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
