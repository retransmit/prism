import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";
import { ClientTrackingStateProviderPlugin } from ".";

const plugins: {
  [name: string]: ClientTrackingStateProviderPlugin;
} = {
  memory: {
    getTrackingInfo: inMemoryPlugin.getTrackingInfo,
    setTrackingInfo: inMemoryPlugin.setTrackingInfo,
  },
  redis: {
    getTrackingInfo: redisPlugin.getTrackingInfo,
    setTrackingInfo: redisPlugin.setTrackingInfo,
  },
};

export default plugins;
