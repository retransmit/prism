import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";
import { HttpServiceTrackingStateProviderPlugin } from ".";

const plugins: {
  [name: string]: HttpServiceTrackingStateProviderPlugin;
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
