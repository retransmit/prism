import { AppConfig, WebSocketProxyAppConfig } from "../../types";

export function isWebSocketProxyConfig(
  config: AppConfig
): config is WebSocketProxyAppConfig {
  return typeof config.webSocket !== "undefined";
}
