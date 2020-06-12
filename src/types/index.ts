import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpRequestHandlerResponse, HttpRouteConfig } from "./http";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  WebSocketMessageRequest,
} from "./webSocket";

export {
  HttpServiceHttpRequestHandlerConfig,
  RedisServiceHttpRequestHandlerConfig,
  HttpRequestHandlerConfig,
} from "./http";
1;

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  instanceId: string;
  http?: HttpProxyConfig;
  webSocket?: WebSocketProxyConfig;
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
}

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
  >;
  onResponse?: (
    response: HttpResponse,
    request: HttpRequest
  ) => Promise<HttpResponse>;
  genericErrors?: boolean;
  onError?: (
    responses: FetchedHttpRequestHandlerResponse[],
    request: HttpRequest
  ) => any;
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
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
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
  content?: any;
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
