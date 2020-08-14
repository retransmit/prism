import { WebSocketProxyAppConfig } from "./config";
import WebSocket from "ws";

export type ActiveWebSocketConnection = {
  id: string;
  initialized: boolean;
  route: string;
  webSocket: WebSocket;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
  saveLastRequest: boolean;
  lastRequest: string | undefined;
};

export type WebSocketClientRequest = {
  id: string;
  message: string | undefined;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type WebSocketServiceRequestBase = {
  id: string;
  type: "message" | "connect" | "disconnect" | "notconnected";
  route: string;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type WebSocketServiceConnectRequest = {
  type: "connect";
} & WebSocketServiceRequestBase;

export type WebSocketServiceMessageRequest = {
  type: "message";
  message: string | undefined;
} & WebSocketServiceRequestBase;

export type WebSocketServiceDisconnectRequest = {
  type: "disconnect";
} & WebSocketServiceRequestBase;

export type WebSocketServiceNotConnectedRequest = {
  type: "notconnected";
} & WebSocketServiceRequestBase;

export type WebSocketServiceRequest =
  | WebSocketServiceConnectRequest
  | WebSocketServiceMessageRequest
  | WebSocketServiceDisconnectRequest
  | WebSocketServiceNotConnectedRequest;

export type RedisWebSocketServiceRequestProps = {
  responseChannel: string;
};

export type RedisWebSocketServiceRequest = WebSocketServiceRequest &
  RedisWebSocketServiceRequestProps;

export type WebSocketServiceResponseBase = {
  id: string;
  service: string;
};

export type WebSocketServiceMessageResponse = {
  type: "message";
  message: string;
} & WebSocketServiceResponseBase;

export type WebSocketServiceDropResponse = {
  type: "drop";
  message?: string;
} & WebSocketServiceResponseBase;

export type WebSocketServiceResponse =
  | WebSocketServiceMessageResponse
  | WebSocketServiceDropResponse;

export type RedisWebSocketServiceResponse = WebSocketServiceResponse & {
  responseChannel?: string;
};

export type WebSocketServicePlugin = {
  init: (config: WebSocketProxyAppConfig) => any;
  handleRequest: (
    request: WebSocketServiceRequest,
    conn: ActiveWebSocketConnection,
    config: WebSocketProxyAppConfig
  ) => void;
};
