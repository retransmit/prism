import { AppConfig, HttpProxyAppConfig } from "../../types";

export default function isHttpServiceAppConfig(
  config: AppConfig
): config is HttpProxyAppConfig {
  return typeof config.http !== "undefined";
}
