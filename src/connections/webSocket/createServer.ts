import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";
import { AppConfig } from "../../types";

export default async function createServer(httpServer: any, config: AppConfig) {
  const wss = new WebSocket.Server({ noServer: true });

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws: any) {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(function noop() {});
    });
  }, 30000);

  wss.on("close", function close() {
    clearInterval(interval);
  });

  httpServer.on("upgrade", makeUpgrade(wss));

  wss.on("connection", createHandler(config));
  return wss;
}

function makeUpgrade(webSocketServer: WebSocket.Server) {
  return function upgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    if (request.url) {
      if (webSocketServer) {
        webSocketServer.handleUpgrade(request, socket, head, function done(ws) {
          webSocketServer.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  };
}
