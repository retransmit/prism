import { promisify } from "util";

import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";

function closeHttpServerCb(server: HttpServer | HttpsServer, cb: any) {
  (server as any).close(cb);
}

const promisifiedCloseHttpServer = promisify(closeHttpServerCb);

export async function closeHttpServer(server: HttpServer | HttpsServer) {
  await promisifiedCloseHttpServer(server);
}
