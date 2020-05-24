import { ServiceConfig } from "./ServiceConfig";
import { HttpResponse, HttpRequest, RedisServiceRequest } from ".";
import WebSocketRequestContext from "../requestHandlers/websocket/WebSocketRequestContext";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: ServiceConfig;
  };
  onConnect: (ctx: WebSocketRequestContext) => Promise<{ drop: boolean }>;
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
export type WebSocketServiceConfigBase = {
  onServiceResponse?: (
    response: HttpResponse | undefined
  ) => Promise<HttpResponse>;
  onError?: (
    response: HttpResponse | undefined,
    request: HttpRequest
  ) => Promise<void>;
};

export type RedisWebSocketServiceConfig = {
  type: "redis";
  config: {
    requestChannel: string;
    responseChannel: string;
    numRequestChannels?: number;
    onServiceRequest?: (request: RedisServiceRequest) => Promise<any>;
  };
} & WebSocketServiceConfigBase;

export type HttpWebSocketServiceConfig = {
  type: "http";
  pollingInterval: number;
  config: {
    url: string;
    onConnectUrl: string;
    onDisconnectUrl: string;
    onServiceRequest?: (request: HttpRequest) => Promise<HttpRequest>;
  };
} & WebSocketServiceConfigBase;

export type WebSocketServiceConfig =
  | RedisWebSocketServiceConfig
  | HttpWebSocketServiceConfig;
