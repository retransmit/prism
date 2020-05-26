import { HttpRequest } from ".";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: WebSocketHandlerConfig;
  };
  onConnect?: (message: string) => Promise<{ drop: boolean }>;
  onDisconnect?: () => Promise<void>;
  onRequest?: (
    message: string
  ) => Promise<
    { handled: true; request: WebSocketRequest } | { handled: false }
  >;
  onResponse?: (
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
};

/*
  Service Configuration.
*/
export type WebSocketHandlerConfigBase = {
  onResponse?: (
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
};

export type RedisServiceWebSocketHandlerConfig = {
  type: "redis";
  onRequest?: (
    request: WebSocketRequest
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: WebSocketRequest }
  >;
  config: {
    requestChannel: string;
    numRequestChannels?: number;
  };
} & WebSocketHandlerConfigBase;

export type HttpServiceWebSocketHandlerConfig = {
  type: "http";
  pollingInterval: number;
  onRequest?: (
    request: WebSocketRequest
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: HttpRequest }
  >;
  config: {
    url: string;
    onConnectUrl: string;
    onDisconnectUrl: string;
  };
} & WebSocketHandlerConfigBase;

export type WebSocketHandlerConfig =
  | RedisServiceWebSocketHandlerConfig
  | HttpServiceWebSocketHandlerConfig;

/*
  Requests and Responses for Http Services
*/
export type HttpServiceWebSocketRequest = {
  id: string;
  request: string;
};

export type HttpServiceWebSocketResponse = {
  id: string;
  service: string;
  response: string;
};

/*
  Requests and Responses for Redis-based Services
*/
export type WebSocketRequest = {
  id: string;
  type: "connect" | "message" | "disconnect";
  route: string;
  responseChannel: string;
  request: string;
};

export type WebSocketResponse = {
  id: string;
  type: "message" | "disconnect";
  route: string;
  service: string;
  response: string;
};
