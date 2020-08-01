import { AppConfig } from "./config";

export type AppControl = {
  config: AppConfig;
  instanceId: string;
  port: number;
  closeServers: () => Promise<void>;
};
