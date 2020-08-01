import randomId from "./utils/random";
import { AppConfig } from "./types/config";

export default async function mutateAndCleanupConfig(config: AppConfig) {
  // People are going to mistype 'webSocket' as all lowercase.
  if ((config as any).websocket !== undefined) {
    if (config.webSocket !== undefined) {
      console.log(
        "Both config.websocket and config.webSocket are specified. 'webSocket' is the correct property to use."
      );
      process.exit(1);
    }
    config.webSocket = (config as any).websocket;
    (config as any).websocket = undefined;
  }

  // People are going to mistype 'webjobs' as all lowercase.
  if ((config as any).webjobs !== undefined) {
    if (config.webJobs !== undefined) {
      console.log(
        "Both config.webjobs and config.webJobs are specified. 'webJobs' is the correct property to use."
      );
      process.exit(1);
    }
    config.webJobs = (config as any).webjobs;
    (config as any).webjobs = undefined;
  }

  // Initialize state
  if (!config.state) {
    config.state = "memory";
  }

  config.hostId =
    config.hostNames && config.hostNames.length
      ? config.hostNames.join("+")
      : "$default";

  // Auto generate a random responseChannel for redis.
  [config.http, config.webSocket].forEach((proxyCfg) => {
    if (proxyCfg) {
      if (proxyCfg.redis && !proxyCfg.redis.responseChannel) {
        proxyCfg.redis.responseChannel = randomId();
      }

      if (!proxyCfg.redis) {
        proxyCfg.redis = {
          responseChannel: randomId(),
        };
      }
    }
  });

  config.silent = config.silent ?? false;
}
