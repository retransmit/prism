import { PluginList } from "../../../../types/plugins";
import * as inMemoryPlugin from "./inMemory";
import * as redisPlugin from "./redis";
import { HttpProxyCacheConfig } from "../../../../types/config/httpProxy/caching";
import { AppConfig } from "../../../../types/config";
import { HttpResponse } from "../../../../types/http";

export type HttpProxyCacheStateProviderPlugin = {
  get: (
    key: string,
    cacheConfig: HttpProxyCacheConfig,
    config: AppConfig
  ) => Promise<HttpResponse | undefined>;
  set: (
    key: string,
    response: HttpResponse,
    cacheConfig: HttpProxyCacheConfig,
    config: AppConfig
  ) => Promise<void>;
};

const plugins: PluginList<HttpProxyCacheStateProviderPlugin> = {
  memory: {
    get: inMemoryPlugin.get,
    set: inMemoryPlugin.set,
  },
  redis: {
    get: redisPlugin.get,
    set: redisPlugin.set,
  },
};

export default plugins;
