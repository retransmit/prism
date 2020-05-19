import "mocha";
import "should";
import request = require("supertest");
import { promisify } from "util";
import Koa = require("koa");

import mergeResults from "./redis/mergeResults";
import httpMethods from "./redis/httpMethods";
import dontMergeIgnored from "./redis/dontMergeIgnored";
import showGenericErrors from "./redis/showGenericErrors";
import mustNotOverwriteJsonWithString from "./redis/mustNotOverwriteJsonWithString";

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

    before(async function resetEverything() {});

    beforeEach(async function resetBeforeEach() {});

    afterEach(async function resetAfterEach() {
      await closeServer(app.instance);
    });

    describe("redis", () => {
      httpMethods(app);
      mergeResults(app);
      dontMergeIgnored(app);
      mustNotOverwriteJsonWithString(app);
      showGenericErrors(app);
    });
  });
}

run();
