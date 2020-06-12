import { promisify } from "util";
import WebSocket from "ws";

function closeWebSocketServerCb(server: WebSocket.Server, cb: any) {
  (server as any).close(cb);
}

const promisifiedCloseWebSocketServer = promisify(closeWebSocketServerCb);

export async function closeWebSocketServer(server: WebSocket.Server) {
  await promisifiedCloseWebSocketServer(server);
}
