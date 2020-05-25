import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import HttpRequestContext from "../requestHandlers/http/RequestContext";
import { FetchedHttpHandlerResponse, HttpRouteConfig } from "./httpRequests";
import { WebSocketRouteConfig } from "./webSocketRequests";
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
    cleanupInterval?: number;
  };
}

export type HttpProxyConfig = {
  routes: {
    [key: string]: {
      [key in HttpMethods]?: HttpRouteConfig;
    };
  };
  onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
  onResponse?: (
    ctx: HttpRequestContext,
    response: any
  ) => Promise<{ handled: boolean }>;
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
  onRequest?: (ctx: HttpRequest) => Promise<{ handled: boolean }>;
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
