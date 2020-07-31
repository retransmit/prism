import { HttpRequest } from "../../types/http";
import { WebSocketProxyAppConfig } from "../../types/config";
import { WebSocketRouteConfig } from "../../types/config/webSocketProxy";

export default function getRouteConfig(
  route: string,
  config: WebSocketProxyAppConfig
): WebSocketRouteConfig {
  return config.webSocket.routes[route];
}
