import { RedisServiceHttpHandlerConfig } from "../../types";

export function getChannelForService(
  channel: string,
  numRequestChannels: number | undefined
): string {
  return !numRequestChannels
    ? channel
    : `${channel}${Math.floor(
        Math.random() * numRequestChannels
      )}`;
}
