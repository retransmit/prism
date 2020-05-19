import "mocha";
import "should";
import request = require("supertest");
import { promisify } from "util";
import Koa = require("koa");

import httpHttpMethods from "./http/httpMethods";

import redisHttpMethods from "./redis/httpMethods";
import redisMergeResults from "./redis/mergeResults";
import redisDontMergeIgnored from "./redis/dontMergeIgnored";
import redisShowGenericErrors from "./redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./redis/mustNotOverwriteJsonWithString";

import startBackendHttpMockServer from "./http/startBackendHttpMockServer";

function closeServerCb(app: Koa<any, any>, cb: any) {
  (app as any).close(cb);
}

const closeServer = promisify(closeServerCb);

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  if (!process.env.CONFIG_DIR) {
    throw new Error(
      "The configuration directory should be specified in process.env.CONFIG_DIR"
    );
  }

  const configDir = process.env.CONFIG_DIR;

  describe("retransmit", () => {
    let app: { instance: any } = { instance: undefined };

    before(async function resetEverything() {
      startBackendHttpMockServer(6666);
    });

    beforeEach(async function resetBeforeEach() {});

    afterEach(async function resetAfterEach() {
      await closeServer(app.instance);
    });

    describe("redis", () => {
      redisHttpMethods(app);
      redisMergeResults(app);
      redisDontMergeIgnored(app);
      redisShowGenericErrors(app);
      redisMustNotOverwriteJsonWithString(app);
    });

    describe("http", () => {
      httpHttpMethods(app);
    });
  });
}

run();
