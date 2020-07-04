import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpResponse, HttpRouteConfig } from "./http";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  WebSocketMessageRequest,
} from "./webSocket";
import * as httpModule from "http";
import * as httpsModule from "https";

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
  createHttpsServer?: (
    options: httpsModule.ServerOptions,
    listener: httpModule.RequestListener
  ) => httpsModule.Server;
  createHttpServer?: (
    listener: httpModule.RequestListener
  ) => httpModule.Server;
};

export type HttpProxyAppConfig = AppConfig & { http: HttpProxyConfig };
export type WebSocketProxyAppConfig = AppConfig & {
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
  errorBody?: any;
};

export type HttpServiceCircuitBreakerConfig = {
  maxErrors: number;
  duration: number;
  isFailure?: (response: HttpServiceErrorTrackingInfo) => boolean;
  errorStatus?: number;
  errorBody?: any;
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

export type Algorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "none";

export type HttpServiceJwtAuthentication = {
  type: "jwt";
  key: string;
  jwtHeaderField?: string;
  getJwt?: (request: HttpRequest) => string;
  jwtBodyField?: string;
  verify?: (jwt: string | object, request: HttpRequest) => Promise<boolean>;
  onError?: (error: any, request: HttpRequest) => any;
  errorStatus?: number;
  errorBody?: any;
  verifyOptions?: {
    algorithms?: Algorithm[];
    audience?: string; // | RegExp | Array<string | RegExp>;
    clockTimestamp?: number;
    clockTolerance?: number;
    /** return an object with the decoded `{ payload, header, signature }` instead of only the usual content of the payload. */
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    /**
     * If you want to check `nonce` claim, provide a string value here.
     * It is used on Open ID for the ID Tokens. ([Open ID implementation notes](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes))
     */
    nonce?: string;
    subject?: string;
  };
};

export type HttpServiceAuthentication = HttpServiceJwtAuthentication;

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
