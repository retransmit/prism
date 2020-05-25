import { WebSocketRouteConfig } from "../../../../types/webSocketRequests";
import { WebSocketProxyConfig } from "../../../../types";

export default function handleMessage(
  requestId: string,
  message: string,
  route: string,
  websocketConfig: WebSocketProxyConfig
) {
  const routeConfig = websocketConfig.routes[route];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];

    if (serviceConfig.type === "http") {
      
    }
  }
}
