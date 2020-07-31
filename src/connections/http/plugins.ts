import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";
import { HttpServicePlugin } from "../../types/config/httpProxy";

const plugins: {
  [name: string]: HttpServicePlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
    handleStreamRequest: httpPlugin.handleStreamRequest,
    rollback: httpPlugin.rollback,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
    handleStreamRequest: redisPlugin.handleStreamRequest,
    rollback: redisPlugin.rollback,
  },
};

export default plugins;
