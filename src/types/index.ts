import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import HttpRequestContext from "../requestHandlers/http/RequestContext";
import { FetchedHttpResponse, RouteConfig } from "./HttpRequests";
export {
  HttpServiceHttpHandlerConfig,
  RedisServiceHttpHandlerConfig,
  HttpHandlerConfig,
} from "./HttpRequests";1

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  http: {
    routes: {
      [key: string]: {
        [key in HttpMethods]?: RouteConfig;
      };
    };
    onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
    onResponse?: (
      ctx: HttpRequestContext,
      response: any
    ) => Promise<{ handled: boolean }>;
    genericErrors?: boolean;
    onError?: (
      responses: FetchedHttpResponse[],
      request: HttpRequest
    ) => Promise<void>;
  };
  websockets?: {
    routes: {
      [key: string]: {
        services: {
          onRequest?: (ctx: HttpRequest) => Promise<{ handled: boolean }>;
        };
      };
    };
    onRequest?: (ctx: HttpRequest) => Promise<{ handled: boolean }>;
  };
  redis?: {
    options?: ClientOpts;
    cleanupInterval?: number;
  };
}

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
