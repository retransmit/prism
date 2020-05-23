import { ServiceConfig } from "./ServiceConfig";
import { HttpResponse, HttpRequest, RedisServiceRequest } from ".";
import WebSocketRequestContext from "../clients/WebSocketRequestContext";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: ServiceConfig;
  };
  onConnect: (ctx: WebSocketRequestContext) => Promise<{ handled: boolean }>;
  onRequest?: (ctx: WebSocketRequestContext) => Promise<{ handled: boolean }>;
  onResponse?: (
    ctx: WebSocketRequestContext,
    response: any
  ) => Promise<{ handled: boolean }>;
};

/*
  Service Configuration.
*/
export type WebSocketServiceConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
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
    onRollbackRequest?: (request: RedisServiceRequest) => Promise<any>;
  };
} & WebSocketServiceConfigBase;

export type HttpWebSocketServiceConfig = {
  type: "http";
  config: {
    url: string;
    rollbackUrl?: string;
    onServiceRequest?: (request: HttpRequest) => Promise<HttpRequest>;
    onRollbackRequest?: (request: HttpRequest) => Promise<HttpRequest>;
  };
} & WebSocketServiceConfigBase;

export type WebSocketServiceConfig =
  | RedisWebSocketServiceConfig
  | HttpWebSocketServiceConfig;
