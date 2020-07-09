import { AppConfig } from "../types";
import error from "../error";

let config: AppConfig | undefined = undefined;

export function set(c: AppConfig) {
  config = c;
}

export function get(): AppConfig {
  return (
    config ||
    error("AppConfig is uninitialized. This should not have happened.")
  );
}
