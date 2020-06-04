import Koa = require("koa");
import { promisify } from "util";
import { Server } from "http";
import WebSocket from "ws";

function closeHttpServerCb(server: Server, cb: any) {
  (server as any).close(cb);
}

const promisifiedCloseHttpServer = promisify(closeHttpServerCb);

export async function closeHttpServer(server: Server) {
  await promisifiedCloseHttpServer(server);
}

function closeWebSocketServerCb(server: WebSocket.Server, cb: any) {
  (server as any).close(cb);
}

const promisifiedCloseWebSocketServer = promisify(closeWebSocketServerCb);

export async function closeWebSocketServer(server: WebSocket.Server) {
  await promisifiedCloseWebSocketServer(server);
}
