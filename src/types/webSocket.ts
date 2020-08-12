import { WebSocketProxyAppConfig } from "./config";
import { WebSocketMessageRequest } from "./config/webSocketProxy";
import WebSocket from "ws";

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

export type WebSocketServicePlugin = {
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
