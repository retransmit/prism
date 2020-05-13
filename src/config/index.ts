import { IAppConfig } from "../types";

let config: IAppConfig;

export function init(c: IAppConfig) {
  config = c;
}

export function get(): IAppConfig {
  return config;
}
