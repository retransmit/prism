import { IAppConfig } from "../types";

let config: IAppConfig;

export function set(c: IAppConfig) {
  config = c;
}

export function get(): IAppConfig {
  return config;
}
