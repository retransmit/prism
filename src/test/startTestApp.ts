import { startWithConfiguration } from "..";
import { AppConfig } from "../types";

export default async function startTestApp(config: AppConfig) {
  return await startWithConfiguration(
    process.env.TEST_PORT ? parseInt(process.env.TEST_PORT) : undefined,
    "testinstance",
    config
  );
}
