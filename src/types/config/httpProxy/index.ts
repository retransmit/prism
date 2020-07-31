import { UrlList, UrlSelector, HttpProxyAppConfig } from "..";
import { IRouterContext } from "koa-router";
import { HttpMethods, HttpRequest, HttpResponse } from "../../http";
import { AllowListConfig } from "../allowList";
import { RateLimitingConfig } from "../rateLimiting";
import { HttpProxyCircuitBreakerConfig } from "./circuitBreaker";
import { HttpProxyCacheConfig } from "./caching";
import { HttpProxyServiceTrackingConfig } from "./serviceTracking";
import { HttpProxyAuthenticationConfig } from "./authentication";

export type HttpProxyConfig = {
  routes: {
    [key: string]: {
      [key in HttpMethods | "ALL"]?: HttpRouteConfig;
    };
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  allowList?: AllowListConfig;
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
  ) => Promise<HttpResponse>;
  genericErrors?: boolean;
  onError?: (responses: FetchedHttpResponse[], request: HttpRequest) => any;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
  circuitBreaker?: HttpProxyCircuitBreakerConfig;
  caching?: HttpProxyCacheConfig;
  serviceTracking?: HttpProxyServiceTrackingConfig;
  authentication?: HttpProxyAuthenticationConfig;
};

// Route Config
export type HttpRouteConfig = {
  useStream?: boolean;
  services: {
    [key: string]: HttpServiceEndPointConfig;
  };
  allowList?: AllowListConfig;
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
    responses: FetchedHttpResponse[],
    request: HttpRequest
  ) => Promise<FetchedHttpResponse[] | void>;
  genericErrors?: boolean;
  onError?: (responses: FetchedHttpResponse[], request: HttpRequest) => any;
  rateLimiting?: RateLimitingConfig;
  circuitBreaker?: HttpProxyCircuitBreakerConfig;
  caching?: HttpProxyCacheConfig;
  authentication?: HttpProxyAuthenticationConfig;
};

// Result of Service Invocation
export type InvokeHttpServiceResult =
  | { skip: true }
  | { skip: false; response: FetchedHttpResponse };

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

// Service Configuration
export type HttpRouteConfigBase = {
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
  contentEncoding?: string;
  contentType?: string;
  stage?: number;
};

export type NativeHttpServiceEndPointConfig = {
  type: "http";
  url: UrlList;
  getUrl?: UrlSelector;
  rollback?: (request: HttpRequest) => HttpRequest | void;
  rollbackRequestContentEncoding?: string;
  rollbackRequestContentType?: string;
  onRequest?: (
    request: HttpRequest,
    fetchedResponses: FetchedHttpResponse[]
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
    fetchedResponses: FetchedHttpResponse[]
  ) => Promise<HttpResponse | void>;
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
} & HttpRouteConfigBase;

export type RedisHttpServiceEndPointConfig = {
  type: "redis";
  requestChannel: string;
  numRequestChannels?: number;
  onRequest?: (
    request: RedisHttpRequest,
    fetchedResponses: FetchedHttpResponse[]
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
    fetchedResponses: FetchedHttpResponse[]
  ) => Promise<RedisHttpResponse | void>;
  onRollbackRequest?: (
    request: RedisHttpRequest
  ) => Promise<
    | {
        handled: true;
      }
    | { handled: false; request: string }
    | void
  >;
  onError?: (response: string | undefined, request: HttpRequest) => any;
} & HttpRouteConfigBase;

export type HttpServiceEndPointConfig =
  | RedisHttpServiceEndPointConfig
  | NativeHttpServiceEndPointConfig;

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

export type HttpRouteStageConfig = {
  stage: number | undefined;
  services: {
    [name: string]: HttpServiceEndPointConfig;
  };
};
