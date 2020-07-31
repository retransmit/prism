import { HttpRequest } from "../../../../types/http";
import { HttpProxyAuthenticationConfig } from "../../../../types/config/httpProxy/authentication";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";
import { AppConfig } from "../../../../types/config";
import { PluginList } from "../../../../types/plugins";
import jwt from "./jwt";

type AuthenticationPlugin = (
  request: HttpRequest,
  authConfig: HttpProxyAuthenticationConfig,
  routeConfig: HttpRouteConfig,
  config: AppConfig
) => Promise<{ status: number; body: any } | undefined>;

const plugins: PluginList<AuthenticationPlugin> = {
  jwt,
};

export default plugins;
