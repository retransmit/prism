import "mocha";
import "should";
import request = require("supertest");

import httpHttpMethods from "./integration/http/httpMethods";
import httpMergeResults from "./integration/http/mergeResults";
import httpDontMergeIgnored from "./integration/http/dontMergeIgnored";
import httpMustNotOverwriteJsonWithString from "./integration/http/mustNotOverwriteJsonWithString";
import httpRollsback from "./integration/http/rollsback";

import redisHttpMethods from "./integration/redis/httpMethods";
import redisMergeResults from "./integration/redis/mergeResults";
import redisDontMergeIgnored from "./integration/redis/dontMergeIgnored";
import redisShowGenericErrors from "./integration/redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./integration/redis/mustNotOverwriteJsonWithString";
import redisRollsback from "./integration/redis/rollsback";

import { closeServer } from "./utils";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  describe("retransmit", () => {
    let app: { instance: any } = { instance: undefined };

    describe("http requests (integration)", () => {
      describe("redis", () => {
        afterEach(async function resetAfterEach() {
          await closeServer(app.instance);
        });

        redisHttpMethods(app);
        redisMergeResults(app);
        redisDontMergeIgnored(app);
        redisShowGenericErrors(app);
        redisMustNotOverwriteJsonWithString(app);
        redisRollsback(app);
      });

      describe("http", () => {
        afterEach(async function resetAfterEach() {
          await closeServer(app.instance);
        });

        httpHttpMethods(app);
        httpMergeResults(app);
        httpDontMergeIgnored(app);
        httpMustNotOverwriteJsonWithString(app);
        httpRollsback(app);
      });
    });
  });
}

run();
