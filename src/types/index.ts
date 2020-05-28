import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpHandlerResponse, HttpRouteConfig } from "./httpRequests";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  RedisServiceWebSocketRequest,
} from "./webSocketRequests";

export {
  HttpServiceHttpHandlerConfig,
  RedisServiceHttpHandlerConfig,
  HttpHandlerConfig,
} from "./httpRequests";
1;

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  instanceId: string;
  http?: HttpProxyConfig;
  websockets?: WebSocketProxyConfig;
  redis?: {
    options?: ClientOpts;
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
    responses: FetchedHttpHandlerResponse[],
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
  ) => Promise<{ drop: boolean }>;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    message: string
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: string }
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
  onError?: (requestId: string, response: any) => any;
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
