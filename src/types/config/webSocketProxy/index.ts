import { UrlList, UrlSelector } from "..";
import { AllowListConfig } from "../allowList";
import { RateLimitingConfig } from "../rateLimiting";
import { HttpRequest, HttpResponse } from "../../http";
import {
  WebSocketClientRequest,
  ActiveWebSocketConnection,
  WebSocketServiceResponse,
  WebSocketServiceConnectRequest,
  RedisWebSocketServiceRequest,
  RedisWebSocketServiceResponse,
} from "../../webSocket";

export type WebSocketProxyConfig = {
  routes: {
    [key: string]: WebSocketRouteConfig;
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  allowList?: AllowListConfig;
  onConnect?: (
    request: WebSocketClientRequest
  ) => Promise<{
    drop: boolean;
    message?: string;
    request?: WebSocketServiceConnectRequest;
  } | void>;
  onDisconnect?: (conn: ActiveWebSocketConnection) => Promise<string | void>;
  onRequest?: (
    request: WebSocketClientRequest
  ) => Promise<
    | { handled: true; response?: WebSocketServiceResponse }
    | { handled: false; message: string }
    | void
  >;
  onResponse?: (
    response: WebSocketServiceResponse
  ) => Promise<WebSocketServiceResponse | void>;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
};

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: WebSocketServiceEndPointConfig;
  };
  allowList?: AllowListConfig;
  onConnect?: (
    request: WebSocketClientRequest
  ) => Promise<{
    drop: boolean;
    message?: string;
    request?: WebSocketServiceConnectRequest;
  } | void>;
  onDisconnect?: (conn: ActiveWebSocketConnection) => Promise<string | void>;
  onRequest?: (
    request: WebSocketClientRequest
  ) => Promise<
    | { handled: true; response?: WebSocketServiceResponse }
    | { handled: false; message: string }
    | void
  >;
  onResponse?: (
    response: WebSocketServiceResponse
  ) => Promise<WebSocketServiceResponse | void>;
  rateLimiting?: RateLimitingConfig;
};

/*
  Service Configuration.
*/
export type WebSocketEndPointConfigBase = {};

export type UrlPollingWebSocketEndPointConfig = {
  type: "http";
  pollingInterval?: number;
  resendRequestWhilePolling?: boolean;
  onRequest?: (
    request: HttpRequest
  ) => Promise<
    | { handled: true; response?: WebSocketServiceResponse }
    | { handled: false; request: HttpRequest }
    | void
  >;
  onResponse?: (
    response: HttpResponse
  ) => Promise<WebSocketServiceResponse | void>;

  url: UrlList;
  getUrl?: UrlSelector;
  contentEncoding?: string;
  contentType?: string;

  onError?: (response: HttpResponse | undefined, request: HttpRequest) => any;
} & WebSocketEndPointConfigBase;

export type RedisWebSocketEndPointConfig = {
  type: "redis";
  onRequest?: (
    request: RedisWebSocketServiceRequest
  ) => Promise<
    | { handled: true; response?: WebSocketServiceResponse }
    | { handled: false; request: RedisWebSocketServiceRequest }
    | void
  >;
  onResponse?: (
    response: RedisWebSocketServiceResponse
  ) => Promise<WebSocketServiceResponse | void>;
  
  requestChannel: string;
  numRequestChannels?: number;
} & WebSocketEndPointConfigBase;

export type WebSocketServiceEndPointConfig =
  | UrlPollingWebSocketEndPointConfig
  | RedisWebSocketEndPointConfig;
