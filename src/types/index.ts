import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpResponse, HttpRouteConfig } from "./http";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  WebSocketMessageRequest,
} from "./webSocket";

export {
  HttpServiceHttpHandlerConfig,
  RedisServiceHttpHandlerConfig,
  HttpHandlerConfig,
} from "./http";
1;

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export type AppConfig = {
  instanceId: string;
  http?: HttpProxyConfig;
  webSocket?: WebSocketProxyConfig;
  webJobs?: {
    [name: string]: WebJob;
  };
  redis?: {
    options?: ClientOpts;
  };
  useHttps?: {
    key: string;
    cert: string;
  };
  cors?: {
    origin?: string;
    allowMethods?: string;
    maxAge?: number;
    allowHeaders?: string | string[];
    credentials?: boolean;
  };
  state?: InMemoryStateConfig | RedisStateConfig;
};

export type HttpServiceAppConfig = AppConfig & { http: HttpProxyConfig };
export type WebSocketServiceAppConfig = AppConfig & {
  webSocket: WebSocketProxyConfig;
};

export type InMemoryStateConfig = {
  type: "memory";
  clientTrackingEntryExpiry?: number;
  httpServiceErrorTrackingListExpiry?: number;
};

export type RedisStateConfig = {
  type: "redis";
  options?: ClientOpts;
  clientTrackingListLength?: number;
  clientTrackingListExpiry?: number;
  httpServiceErrorTrackingListLength?: number;
  httpServiceErrorTrackingListExpiry?: number;
};

export type RateLimitingConfig = {
  type: "ip";
  maxRequests: number;
  duration: number;
  errorStatus?: number;
  errorResponse?: any;
};

export type HttpServiceCircuitBreakerConfig = {
  maxErrors: number;
  duration: number;
  isFailure?: (response: HttpServiceErrorTrackingInfo) => boolean;
  errorStatus?: number;
  errorResponse?: any;
};

export type HttpProxyConfig = {
  routes: {
    [key: string]: {
      [key in HttpMethods]?: HttpRouteConfig;
    };
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
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
  ) => Promise<HttpResponse>;
  genericErrors?: boolean;
  onError?: (responses: FetchedHttpResponse[], request: HttpRequest) => any;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
  circuitBreaker?: HttpServiceCircuitBreakerConfig;
  caching?: HttpServiceCacheConfig;
  authentication?: HttpServiceAuthentication;
};

export type WebSocketProxyConfig = {
  routes: {
    [key: string]: WebSocketRouteConfig;
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<{ drop: true; message?: string } | { drop: false }>;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    request: string
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: WebSocketMessageRequest }
    | void
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
};

/*
  Web Jobs
*/
export type WebJob = {
  url: UrlList;
  getUrl?: UrlSelector;
  method?: HttpMethods;
  body?: any;
  interval: number;
  payload?: HttpRequest;
  getPayload?: (url: string) => Promise<HttpRequest>;
};

/*
  Http Requests and Responses
*/
export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string;
  };
  body?: any;
  headers?: {
    [key: string]: string;
  };
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: HttpCookie[];
  headers?: IncomingHttpHeaders;
  body?: any;
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

// That's all we support for now.
export type HttpRequestBodyEncoding =
  | "text/plain"
  | "application/x-www-form-urlencoded"
  | "application/json";

export type UrlList = string | string[];
export type UrlSelector = (urlList: UrlList) => Promise<UrlList>;

export type ClientTrackingInfo = {
  path: string;
  method: HttpMethods;
  time: number;
};

export type HttpServiceErrorTrackingInfo = {
  route: string;
  method: HttpMethods;
  status: number | undefined;
  requestTime: number;
  responseTime: number;
};

export type IApplicationState = {
  clientTracking: Map<string, ClientTrackingInfo[]>;
  httpServiceErrorTracking: Map<string, HttpServiceErrorTrackingInfo[]>;
  httpResponseCache: Map<string, InMemoryCacheEntry>;
};

export type InMemoryCacheEntry = {
  time: number;
  expiry: number;
  response: HttpResponse;
};

export type HttpServiceCacheConfig = {
  varyBy?: {
    headers?: string[];
    query?: string[];
    body?: string[];
  };
  expiry: number;
  maxSize?: number;
};

export type HttpServiceJwtAuthentication = {
  type: "jwt";
  publicKey: string;
  jwtHeaderField?: string;
  jwtBodyField?: string;
  verify?: (jwt: string | object) => Promise<boolean>;
  errorStatus?: number;
  errorResponse?: any;
};
export type HttpServiceAuthentication = HttpServiceJwtAuthentication | "none";

export type Notification =
  | {
      type: "email";
      email: string;
    }
  | {
      type: "sms";
      phoneNumber: string;
    };

export type RateLimitingStateProviderPlugin = {
  getTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    rateLimitingConfig: RateLimitingConfig,
    stateConfig: any
  ) => Promise<ClientTrackingInfo[] | undefined>;
  setTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    trackingInfo: ClientTrackingInfo,
    rateLimitingConfig: RateLimitingConfig,
    stateConfig: any
  ) => Promise<void>;
};

export type PluginList<T> = {
  [name: string]: T;
};
