import { AppConfig } from "../types";

let config: AppConfig;

export function set(c: AppConfig) {
  config = c;
}

export function get(): AppConfig {
  return config;
}
