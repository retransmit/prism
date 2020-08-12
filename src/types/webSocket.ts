import { WebSocketProxyAppConfig } from "./config";
import { WebSocketMessageRequest, ActiveWebSocketConnection } from "./config/webSocketProxy";

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
