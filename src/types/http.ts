import {
  HttpResponse,
  HttpRequest,
  HttpMethods,
  HttpRequestBodyEncoding,
  UrlList,
  UrlSelector,
  RateLimitingConfig,
  HttpServiceCircuitBreakerConfig,
  HttpServiceCacheConfig,
  HttpServiceAuthentication,
  HttpServiceErrorTrackingInfo,
  HttpProxyAppConfig,
} from ".";

/*
  RouteHandler Config
*/
export type HttpRouteConfig = {
  services: {
    [key: string]: HttpServiceEndPointConfig;
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
    responses: FetchedHttpResponse[],
    request: HttpRequest
  ) => Promise<FetchedHttpResponse[] | void>;
  genericErrors?: boolean;
  onError?: (responses: FetchedHttpResponse[], request: HttpRequest) => any;
  rateLimiting?: RateLimitingConfig;
  circuitBreaker?: HttpServiceCircuitBreakerConfig;
  caching?: HttpServiceCacheConfig;
  authentication?: HttpServiceAuthentication;
};

/*
  Result of Service Invocation
*/
export type InvokeHttpServiceResult =
  | { skip: true }
  | { skip: false; response: FetchedHttpResponse };

/*
  Output of processMessage()
*/
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

/*
  Http Requests and Responses for Redis-based Services
*/

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

/*
  Service Configuration
*/
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
  encoding?: HttpRequestBodyEncoding;
  stage?: number;
};

export type NativeHttpServiceEndPointConfig = {
  type: "http";
  url: UrlList;
  getUrl?: UrlSelector;
  rollback?: (originalRequest: HttpRequest) => HttpRequest | void;
  rollbackRequestEncoding?: HttpRequestBodyEncoding;
  onRequest?: (
    request: HttpRequest,
    otherResponses: FetchedHttpResponse[]
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
    otherResponses: FetchedHttpResponse[]
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
    otherResponses: FetchedHttpResponse[]
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
    otherResponses: FetchedHttpResponse[]
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
    otherResponses: FetchedHttpResponse[],
    services: {
      [name: string]: HttpServiceEndPointConfig;
    },
    config: HttpProxyAppConfig
  ) => Promise<InvokeHttpServiceResult>[];
  rollback: (
    requestId: string,
    request: HttpRequest,
    route: string,
    method: HttpMethods,
    config: HttpProxyAppConfig
  ) => void;
};

export type HttpServiceCacheStateProviderPlugin = {
  get: (key: string, stateConfig: any) => Promise<HttpResponse | undefined>;
  set: (
    key: string,
    response: HttpResponse,
    stateConfig: any,
    cacheConfig: HttpServiceCacheConfig
  ) => Promise<void>;
};

export type HttpServiceCircuitBreakerStateProviderPlugin = {
  getTrackingInfo: (
    route: string,
    method: HttpMethods,
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: any
  ) => Promise<HttpServiceErrorTrackingInfo[] | undefined>;
  setTrackingInfo: (
    route: string,
    method: HttpMethods,
    trackingInfo: HttpServiceErrorTrackingInfo,
    circuitBreakerConfig: HttpServiceCircuitBreakerConfig,
    stateConfig: any
  ) => Promise<void>;
};
