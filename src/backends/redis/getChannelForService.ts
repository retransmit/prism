import { RedisServiceConfig } from "../../types";

export function getChannelForService(
  serviceConfig: RedisServiceConfig
): string {
  const channel = serviceConfig.config.requestChannel;

  return !serviceConfig.config.numRequestChannels
    ? channel
    : `${channel}${Math.floor(
        Math.random() * serviceConfig.config.numRequestChannels
      )}`;
}
