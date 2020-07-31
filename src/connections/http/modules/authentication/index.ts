import { HttpRequest } from "../../../../types/http";
import { HttpProxyAuthenticationConfig } from "../../../../types/config/httpProxy/authentication";
import { AppConfig, HttpProxyAppConfig } from "../../../../types/config";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";
import plugins from "./plugins";
import getRouteConfig from "../../getRouteConfig";

export default async function authenticate(
  route: string,
  request: HttpRequest,
  config: HttpProxyAppConfig
): Promise<{ status: number; body: any } | undefined> {
  const routeConfig = getRouteConfig(route, request, config);
  const authConfig = routeConfig?.authentication || config.http.authentication;

  if (authConfig) {
    return await plugins[authConfig.type](
      request,
      authConfig,
      routeConfig,
      config
    );
  }
}
