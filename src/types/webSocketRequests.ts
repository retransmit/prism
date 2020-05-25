import { HttpResponse, HttpRequest } from ".";
import WebSocketRequestContext from "../requestHandlers/websocket/RequestContext";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: WebSocketHandlerConfig;
  };
  onConnect: (message: string) => Promise<{ drop: boolean }>;
  onDisconnect: (ctx: WebSocketRequestContext) => Promise<void>;
  onRequest?: (
    ctx: WebSocketRequestContext
  ) => Promise<{ drop?: boolean; handled: boolean }>;
  onResponse?: (
    ctx: WebSocketRequestContext,
    response: any
  ) => Promise<{ drop?: boolean; handled: boolean }>;
};

/*
  Service Configuration.
*/
export type WebSocketHandlerConfigBase = {
  onServiceResponse?: (
    response: HttpResponse | undefined
  ) => Promise<HttpResponse>;
  onError?: (
    response: HttpResponse | undefined,
    request: HttpRequest
  ) => Promise<void>;
};

export type RedisServiceWebSocketHandlerConfig = {
  type: "redis";
  config: {
    requestChannel: string;
    responseChannel: string;
    numRequestChannels?: number;
    onMessage?: (message: string) => Promise<string>;
    onResponse?: (message: string) => Promise<string>;
  };
} & WebSocketHandlerConfigBase;

export type HttpServiceWebSocketHandlerConfig = {
  type: "http";
  pollingInterval: number;
  config: {
    url: string;
    onConnectUrl: string;
    onDisconnectUrl: string;
    onServiceRequest?: (request: HttpRequest) => Promise<HttpRequest>;
  };
} & WebSocketHandlerConfigBase;

export type WebSocketHandlerConfig =
  | RedisServiceWebSocketHandlerConfig
  | HttpServiceWebSocketHandlerConfig;

/*
  Requests and Responses for Redis-based Services
*/
export type RedisServiceHttpRequest = {
  id: string;
  responseChannel: string;
  request: string;
};

export type RedisServiceHttpResponse = {
  id: string;
  service: string;
  response: string;
};
