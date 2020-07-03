import {
  HttpRequest,
  HttpResponse,
  HttpRequestBodyEncoding,
  UrlList,
  UrlSelector,
  RateLimitingConfig,
  WebSocketProxyAppConfig,
} from ".";
import WebSocket from "ws";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: WebSocketServiceEndPointConfig;
  };
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<{ drop: true; message?: string } | { drop: false } | void>;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    message: string
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: WebSocketMessageRequest }
    | void
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse | void>;
  rateLimiting?: RateLimitingConfig;
};

/*
  Service Configuration.
*/
export type WebSocketHandlerConfigBase = {};

export type HttpWebSocketEndPointConfig = {
  type: "http";
  pollingInterval?: number;
  resendRequestWhilePolling?: boolean;

  onRequest?: (
    request: HttpRequest
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: HttpRequest }
    | void
  >;

  onResponse?: (
    requestId: string,
    response: HttpResponse
  ) => Promise<WebSocketResponse | void>;

  url: UrlList;
  getUrl?: UrlSelector;
  encoding?: HttpRequestBodyEncoding;

  onConnectUrl?: UrlList;
  getOnConnectUrl?: UrlSelector;
  onConnectRequestEncoding?: HttpRequestBodyEncoding;

  onDisconnectUrl?: UrlList;
  getOnDisconnectUrl?: UrlSelector;
  onDisconnectRequestEncoding?: HttpRequestBodyEncoding;

  onError?: (response: HttpResponse | undefined, request: HttpRequest) => any;
} & WebSocketHandlerConfigBase;

export type RedisWebSocketEndPointConfig = {
  type: "redis";
  onRequest?: (
    request: RedisWebSocketRequest
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: string }
    | void
  >;
  onResponse?: (
    requestId: string,
    response: string
  ) => Promise<WebSocketResponse | void>;
  requestChannel: string;
  numRequestChannels?: number;
} & WebSocketHandlerConfigBase;

export type WebSocketServiceEndPointConfig =
  | HttpWebSocketEndPointConfig
  | RedisWebSocketEndPointConfig;

/*
  WebSocket Requests and Responses
*/
export type WebSocketMessageRequest = {
  type: "message";
  request: string;
} & WebSocketRequestBase;

export type WebSocketConnectRequest = {
  type: "connect";
} & WebSocketRequestBase;

export type WebSocketDisconnectRequest = {
  type: "disconnect";
} & WebSocketRequestBase;

export type WebSocketNotConnectedRequest = {
  type: "notconnected";
} & WebSocketRequestBase;

export type WebSocketResponse = {
  id: string;
  type: "message" | "disconnect" | "null";
  route: string;
  service: string;
  response: string;
};

/*
  Requests and Responses for Http Services
*/
export type HttpWebSocketMessageRequest = WebSocketMessageRequest;
export type HttpWebSocketConnectRequest = WebSocketConnectRequest;

export type HttpWebSocketRequest =
  | HttpWebSocketMessageRequest
  | HttpWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;

export type HttpWebSocketResponse = {
  id: string;
  service: string;
  response: string;
};

/*
  Requests and Responses for Redis-based Services
*/
export type WebSocketRequestBase = {
  id: string;
  route: string;
  path: string;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type RedisWebSocketMessageRequest = {
  responseChannel: string;
} & WebSocketMessageRequest;

export type RedisWebSocketConnectRequest = {
  responseChannel: string;
} & WebSocketConnectRequest;

export type RedisWebSocketRequest =
  | RedisWebSocketMessageRequest
  | RedisWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;

export type WebSocketRequest =
  | HttpWebSocketRequest
  | RedisWebSocketRequest;

export type ActiveWebSocketConnection = {
  initialized: boolean;
  route: string;
  path: string;
  webSocket: WebSocket;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
  saveLastRequest: boolean;
  lastRequest: WebSocketMessageRequest | undefined;
};

export type IWebSocketHandlerPlugin = {
  init: (config: WebSocketProxyAppConfig) => any;
  handleRequest: (
    request: WebSocketMessageRequest,
    conn: ActiveWebSocketConnection,
    config: WebSocketProxyAppConfig
  ) => void;
  connect: (
    requestId: string,
    conn: ActiveWebSocketConnection,
    serviceConfig: any,
    config: WebSocketProxyAppConfig
  ) => void;
  disconnect: (
    requestId: string,
    conn: ActiveWebSocketConnection,
    serviceConfig: any,
    config: WebSocketProxyAppConfig
  ) => void;
};
