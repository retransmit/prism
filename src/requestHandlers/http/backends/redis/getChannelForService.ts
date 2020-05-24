import { RedisServiceHttpHandlerConfig } from "../../../../types";

export function getChannelForService(
  serviceConfig: RedisServiceHttpHandlerConfig
): string {
  const channel = serviceConfig.config.requestChannel;

  return !serviceConfig.config.numRequestChannels
    ? channel
    : `${channel}${Math.floor(
        Math.random() * serviceConfig.config.numRequestChannels
      )}`;
}
