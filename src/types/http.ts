import {
  HttpResponse,
  HttpRequest,
  HttpMethods,
  HttpProxyConfig,
  IAppConfig,
  HttpRequestBodyEncoding,
} from ".";

/*
  RouteHandler Config
*/
export type HttpRouteConfig = {
  services: {
    [key: string]: HttpRequestHandlerConfig;
  };
  onRequest?: (
    request: HttpRequest
  ) => Promise<
    | { handled: true; response: HttpResponse }
    | { handled: false; request: HttpRequest }
    | void
  >;
  onResponse?: (
    response: HttpResponse,
    request: HttpRequest
  ) => Promise<HttpResponse | void>;
  mergeResponses?: (
    responses: FetchedHttpRequestHandlerResponse[],
    request: HttpRequest
  ) => Promise<FetchedHttpRequestHandlerResponse[]>;
  genericErrors?: boolean;
  onError?: (
    responses: FetchedHttpRequestHandlerResponse[],
    request: HttpRequest
  ) => any;
};

/*
  Result of Service Invocation
*/
export type InvokeServiceResult =
  | { skip: true }
  | { skip: false; response: FetchedHttpRequestHandlerResponse };

/*
  Output of processMessage()
*/
export type FetchedHttpRequestHandlerResponse = {
  type: "http" | "redis";
  id: string;
  service: string;
  time: number;
  path: string;
  method: HttpMethods;
  response: HttpResponse;
  stage: number | undefined;
};

/*
  Http Requests and Responses for Redis-based Services
*/
export type RedisServiceHttpRequestBase = {
  id: string;
  request: HttpRequest;
};

export type RedisServiceHttpRequest = RedisServiceHttpRequestBase &
  (
    | {
        type: "request";
        responseChannel: string;
      }
    | {
        type: "rollback";
      }
  );

export type RedisServiceHttpResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

/*
  Service Configuration
*/
export type HttpRequestHandlerConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
  mapping?: {
    fields?: {
      include?: {
        [name: string]: string;
      };
      exclude?: string[];
    };
    headers?: {
      include?: {
        [name: string]: string;
      };
      exclude?: string[];
    };
  };
  encoding?: HttpRequestBodyEncoding;
  stage?: number;
};

export type HttpServiceHttpRequestHandlerConfig = {
  type: "http";
  url: string;
  rollback?: (originalRequest: HttpRequest) => HttpRequest | undefined;
  rollbackRequestEncoding?: HttpRequestBodyEncoding;
  onRequest?: (
    request: HttpRequest,
    otherResponses: FetchedHttpRequestHandlerResponse[]
  ) => Promise<
    | {
        handled: true;
        response: HttpResponse;
      }
    | { handled: false; request: HttpRequest }
    | void
  >;
  onResponse?: (
    response: HttpResponse,
    request: HttpRequest,
    otherResponses: FetchedHttpRequestHandlerResponse[]
  ) => Promise<HttpResponse>;
  onRollbackRequest?: (
    request: HttpRequest
  ) => Promise<
    | {
        handled: true;
      }
    | { handled: false; request: HttpRequest }
    | void
  >;
  onError?: (response: HttpResponse | undefined, request: HttpRequest) => any;
} & HttpRequestHandlerConfigBase;

export type RedisServiceHttpRequestHandlerConfig = {
  type: "redis";
  requestChannel: string;
  numRequestChannels?: number;
  onRequest?: (
    request: RedisServiceHttpRequest,
    otherResponses: FetchedHttpRequestHandlerResponse[]
  ) => Promise<
    | {
        handled: true;
        response: HttpResponse;
      }
    | { handled: false; request: string }
    | void
  >;
  onResponse?: (
    response: string,
    request: HttpRequest,
    otherResponses: FetchedHttpRequestHandlerResponse[]
  ) => Promise<RedisServiceHttpResponse>;
  onRollbackRequest?: (
    request: RedisServiceHttpRequest
  ) => Promise<
    | {
        handled: true;
      }
    | { handled: false; request: string }
    | void
  >;
  onError?: (response: string | undefined, request: HttpRequest) => any;
} & HttpRequestHandlerConfigBase;

export type HttpRequestHandlerConfig =
  | RedisServiceHttpRequestHandlerConfig
  | HttpServiceHttpRequestHandlerConfig;

export type IHttpRequestHandlerPlugin = {
  init: (config: IAppConfig) => any;
  handleRequest: (
    requestId: string,
    request: HttpRequest,
    stage: number | undefined,
    otherResponses: FetchedHttpRequestHandlerResponse[],
    services: {
      [name: string]: HttpRequestHandlerConfig;
    },
    httpConfig: HttpProxyConfig
  ) => Promise<InvokeServiceResult>[];
  rollback: (
    requestId: string,
    request: HttpRequest,
    httpConfig: HttpProxyConfig
  ) => void;
};
