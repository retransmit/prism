import { HttpRequest, HttpResponse, WebSocketProxyConfig, IAppConfig, HttpRequestBodyEncoding } from ".";
import WebSocket from "ws";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: any;
  };
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<{ drop: true; message?: string } | { drop: false }>;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    message: string
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: WebSocketMessageRequest }
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
};

/*
  Service Configuration.
*/
export type WebSocketRequestHandlerConfigBase = {};

export type HttpServiceWebSocketRequestHandlerConfig = {
  type: "http";
  pollingInterval?: number;
  resendRequestWhilePolling?: boolean;
  onRequest?: (
    request: HttpRequest
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: HttpRequest }
  >;
  onResponse?: (
    requestId: string,
    response: HttpResponse
  ) => Promise<WebSocketResponse>;
  url: string;
  encoding?: HttpRequestBodyEncoding;
  onConnectUrl?: string;
  onConnectRequestEncoding?: HttpRequestBodyEncoding;
  onDisconnectUrl?: string;
  onDisconnectRequestEncoding?: HttpRequestBodyEncoding;
  onError?: (response: HttpResponse | undefined, request: HttpRequest) => any;
} & WebSocketRequestHandlerConfigBase;

export type RedisServiceWebSocketRequestHandlerConfig = {
  type: "redis";
  onRequest?: (
    request: RedisServiceWebSocketRequest
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: string }
  >;
  onResponse?: (
    requestId: string,
    response: string
  ) => Promise<WebSocketResponse>;
  requestChannel: string;
  numRequestChannels?: number;
} & WebSocketRequestHandlerConfigBase;

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
export type HttpServiceWebSocketMessageRequest = WebSocketMessageRequest;
export type HttpServiceWebSocketConnectRequest = WebSocketConnectRequest;

export type HttpServiceWebSocketRequest =
  | HttpServiceWebSocketMessageRequest
  | HttpServiceWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;

export type HttpServiceWebSocketResponse = {
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
};

export type RedisServiceWebSocketMessageRequest = {
  responseChannel: string;
} & WebSocketMessageRequest;

export type RedisServiceWebSocketConnectRequest = {
  responseChannel: string;
} & WebSocketConnectRequest;

export type RedisServiceWebSocketRequest =
  | RedisServiceWebSocketMessageRequest
  | RedisServiceWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;

export type WebSocketRequest =
  | HttpServiceWebSocketRequest
  | RedisServiceWebSocketRequest;

export type ActiveWebSocketConnection = {
  initialized: boolean;
  route: string;
  webSocket: WebSocket;
  ip: string | undefined;
  port: number | undefined;
  saveLastRequest: boolean;
  lastRequest: WebSocketMessageRequest | undefined;
};

export type IWebSocketRequestHandlerPlugin = {
  init: (config: IAppConfig) => any;
  handleRequest: (
    request: WebSocketMessageRequest,
    conn: ActiveWebSocketConnection,
    webSocketConfig: WebSocketProxyConfig
  ) => void;
  connect: (
    requestId: string,
    conn: ActiveWebSocketConnection,
    serviceConfig: any,
    webSocketConfig: WebSocketProxyConfig
  ) => void;
  disconnect: (
    requestId: string,
    conn: ActiveWebSocketConnection,
    serviceConfig: any,
    webSocketConfig: WebSocketProxyConfig
  ) => void;
};
