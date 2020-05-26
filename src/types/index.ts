import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpHandlerResponse, HttpRouteConfig } from "./httpRequests";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  WebSocketRequest,
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
    request: HttpRequest,
    response: HttpResponse
  ) => Promise<HttpResponse>;
  genericErrors?: boolean;
  onError?: (
    responses: FetchedHttpHandlerResponse[],
    request: HttpRequest
  ) => Promise<void>;
};

export type WebSocketProxyConfig = {
  routes: {
    [key: string]: WebSocketRouteConfig;
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  onConnect?: (message: string) => Promise<{ drop: boolean }>;
  onDisconnect?: () => Promise<void>;
  onRequest?: (
    message: string
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: string }
  >;
  onResponse?: (
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
};

/*
  Http Requests and Responses
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
