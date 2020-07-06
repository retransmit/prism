import * as httpPlugin from "./plugins/http";
import * as redisPlugin from "./plugins/redis";
import { HttpServicePlugin } from "../../types/http";

const plugins: {
  [name: string]: HttpServicePlugin;
} = {
  http: {
    init: httpPlugin.init,
    handleRequest: httpPlugin.handleRequest,
    rollback: httpPlugin.rollback,
  },
  redis: {
    init: redisPlugin.init,
    handleRequest: redisPlugin.handleRequest,
    rollback: redisPlugin.rollback,
  },
};

export default plugins;