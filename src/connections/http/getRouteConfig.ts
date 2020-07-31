import { HttpRequest } from "../../types/http";
import { HttpProxyAppConfig } from "../../types/config";
import { HttpRouteConfig } from "../../types/config/httpProxy";

export default function getRouteConfig(
  route: string,
  request: HttpRequest,
  config: HttpProxyAppConfig
): HttpRouteConfig {
  return (config.http.routes[route][request.method] ||
    config.http.routes[route]["ALL"]) as HttpRouteConfig;
}
