import Koa = require("koa");
import { promisify } from "util";

function closeServerCb(app: Koa<any, any>, cb: any) {
  (app as any).close(cb);
}

export const closeServer = promisify(closeServerCb);
