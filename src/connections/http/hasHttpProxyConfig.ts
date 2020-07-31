import { AppConfig, HttpProxyAppConfig } from "../../types/config";

export default function hasHttpProxyConfig(
  config: AppConfig
): config is HttpProxyAppConfig {
  return typeof config.http !== "undefined";
}
