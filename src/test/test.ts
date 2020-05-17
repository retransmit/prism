import "mocha";
import "should";
import request = require("supertest");
import { promisify } from "util";
import Koa = require("koa");

import mergeResults from "./mergeResults";
import httpMethods from "./httpMethods";
import dontMergeIgnored from "./dontMergeIgnored";
import showGenericErrors from "./showGenericErrors";
import mustNotOverwriteJsonWithString from "./mustNotOverwriteJsonWithString";

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

  describe("dissipate", () => {
    let app: { instance: any } = { instance: undefined };

    before(async function resetEverything() {});

    beforeEach(async function resetBeforeEach() {});

    afterEach(async function resetAfterEach() {
      await closeServer(app.instance);
    });

    httpMethods(app);
    mergeResults(app);
    dontMergeIgnored(app);
    mustNotOverwriteJsonWithString(app);
    showGenericErrors(app);
  });
}

run();
