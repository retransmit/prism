import "mocha";
import "should";
import WebSocket from "ws";

import httpHttpMethods from "./backends/http/httpMethods";
import httpMergeResults from "./backends/http/mergeResults";
import httpDontMergeIgnored from "./backends/http/dontMergeIgnored";
import httpMustNotOverwriteJsonWithString from "./backends/http/mustNotOverwriteJsonWithString";
import httpRollsback from "./backends/http/rollsback";

import redisHttpMethods from "./backends/redis/httpMethods";
import redisMergeResults from "./backends/redis/mergeResults";
import redisDontMergeIgnored from "./backends/redis/dontMergeIgnored";
import redisShowGenericErrors from "./backends/redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./backends/redis/mustNotOverwriteJsonWithString";
import redisRollsback from "./backends/redis/rollsback";

import { closeHttpServer, closeWebSocketServer } from "../../../utils";
import { Server } from "http";

export default function run(app: {
  servers: {
    httpServer: Server;
    websocketServers: WebSocket.Server[];
  };
}) {
  describe("Http connections (integration)", () => {
    describe("http", () => {
      httpHttpMethods(app);
      httpMergeResults(app);
      httpDontMergeIgnored(app);
      httpMustNotOverwriteJsonWithString(app);
      httpRollsback(app);
    });
    
    describe("redis", () => {
      redisHttpMethods(app);
      redisMergeResults(app);
      redisDontMergeIgnored(app);
      redisShowGenericErrors(app);
      redisMustNotOverwriteJsonWithString(app);
      redisRollsback(app);
    });
  });
}
