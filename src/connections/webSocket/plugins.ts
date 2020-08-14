import * as httpPlugin from "./plugins/urlPolling";
import * as redisPlugin from "./plugins/redis";
import { WebSocketServicePlugin } from "../../types/webSocket";

const plugins: {
  [name: string]: WebSocketServicePlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
  },
};

export default plugins;
