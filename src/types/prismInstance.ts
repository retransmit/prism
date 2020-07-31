export type AppControl = {
  instanceId: string;
  port: number;
  closeServers: () => Promise<void>;
};
