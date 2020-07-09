import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";
import { WebSocketServicePlugin } from "../../types/webSocket";

const plugins: {
  [name: string]: WebSocketServicePlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
    connect: httpPlugin.connect,
    disconnect: httpPlugin.disconnect,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
    connect: redisPlugin.connect,
    disconnect: redisPlugin.disconnect,
  },
};

export default plugins;
