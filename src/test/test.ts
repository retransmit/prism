import "mocha";
import "should";

import httpHttpMethods from "./integration/connections/http/backends/http/httpMethods";
import httpMergeResults from "./integration/connections/http/backends/http/mergeResults";
import httpDontMergeIgnored from "./integration/connections/http/backends/http/dontMergeIgnored";
import httpMustNotOverwriteJsonWithString from "./integration/connections/http/backends/http/mustNotOverwriteJsonWithString";
import httpRollsback from "./integration/connections/http/backends/http/rollsback";

import redisHttpMethods from "./integration/connections/http/backends/redis/httpMethods";
import redisMergeResults from "./integration/connections/http/backends/redis/mergeResults";
import redisDontMergeIgnored from "./integration/connections/http/backends/redis/dontMergeIgnored";
import redisShowGenericErrors from "./integration/connections/http/backends/redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./integration/connections/http/backends/redis/mustNotOverwriteJsonWithString";
import redisRollsback from "./integration/connections/http/backends/redis/rollsback";

import httpConnect from "./integration/connections/websocket/backends/http/connect";

import { closeServer } from "./utils";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  describe("retransmit", () => {
    let app: { instance: any } = { instance: undefined };

    // describe("http connections (integration)", () => {
    //   describe("redis", () => {
    //     afterEach(async function resetAfterEach() {
    //       await closeServer(app.instance);
    //     });

    //     redisHttpMethods(app);
    //     redisMergeResults(app);
    //     redisDontMergeIgnored(app);
    //     redisShowGenericErrors(app);
    //     redisMustNotOverwriteJsonWithString(app);
    //     redisRollsback(app);
    //   });

    //   describe("http", () => {
    //     afterEach(async function resetAfterEach() {
    //       await closeServer(app.instance);
    //     });

    //     httpHttpMethods(app);
    //     httpMergeResults(app);
    //     httpDontMergeIgnored(app);
    //     httpMustNotOverwriteJsonWithString(app);
    //     httpRollsback(app);
    //   });
    // });

    describe("websocket connections (integration)", () => {
      // describe("redis", () => {
      //   afterEach(async function resetAfterEach() {
      //     await closeServer(app.instance);
      //   });

      //   redisHttpMethods(app);
      //   redisMergeResults(app);
      //   redisDontMergeIgnored(app);
      //   redisShowGenericErrors(app);
      //   redisMustNotOverwriteJsonWithString(app);
      //   redisRollsback(app);
      // });

      describe("http", () => {
        afterEach(async function resetAfterEach() {
          await closeServer(app.instance);
        });

        httpConnect(app);
      });
    });
  });
}

run();
