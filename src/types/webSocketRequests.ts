import { HttpHandlerConfig, RedisServiceHttpRequest } from "./httpRequests";
import { HttpResponse, HttpRequest } from ".";
import WebSocketRequestContext from "../requestHandlers/websocket/RequestContext";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: HttpHandlerConfig;
  };
  onConnect: (data: any) => Promise<{ drop: boolean }>;
  onDisconnect: (ctx: WebSocketRequestContext) => Promise<{}>;
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
    onServiceRequest?: (request: RedisServiceHttpRequest) => Promise<any>;
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
