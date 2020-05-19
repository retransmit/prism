import "mocha";
import "should";
import request = require("supertest");

import httpHttpMethods from "./http/httpMethods";
import httpMergeResults from "./http/mergeResults";

import redisHttpMethods from "./redis/httpMethods";
import redisMergeResults from "./redis/mergeResults";
import redisDontMergeIgnored from "./redis/dontMergeIgnored";
import redisShowGenericErrors from "./redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./redis/mustNotOverwriteJsonWithString";
import { closeServer } from "./utils";
import mergeResponses from "../mergeResponses";

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

    describe("redis", () => {
      afterEach(async function resetAfterEach() {
        await closeServer(app.instance);
      });

      redisHttpMethods(app);
      redisMergeResults(app);
      redisDontMergeIgnored(app);
      redisShowGenericErrors(app);
      redisMustNotOverwriteJsonWithString(app);
    });

    describe("http", () => {
      afterEach(async function resetAfterEach() {
        await closeServer(app.instance);
      });

      httpHttpMethods(app);
      httpMergeResults(app);
    });
  });
}

run();
