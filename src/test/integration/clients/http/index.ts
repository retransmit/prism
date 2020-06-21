import "mocha";
import "should";

import httpHttpMethods from "./plugins/http/httpMethods";
import httpMergeResults from "./plugins/http/mergeResults";
import httpDontMergeIgnored from "./plugins/http/dontMergeIgnored";
import httpMustNotOverwriteJsonWithString from "./plugins/http/mustNotOverwriteJsonWithString";
import httpRollsback from "./plugins/http/rollsback";
import httpMapsBody from "./plugins/http/mapsBody";
import httpMapsHeaders from "./plugins/http/mapsHeaders";
import httpUrlEncodedRequests from "./plugins/http/urlEncodedRequests";

import redisHttpMethods from "./plugins/redis/httpMethods";
import redisMergeResults from "./plugins/redis/mergeResults";
import redisDontMergeIgnored from "./plugins/redis/dontMergeIgnored";
import redisShowGenericErrors from "./plugins/redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./plugins/redis/mustNotOverwriteJsonWithString";
import redisRollsback from "./plugins/redis/rollsback";
import redisMapsBody from "./plugins/redis/mapsBody";
import redisMapsHeaders from "./plugins/redis/mapsHeaders";

import { TestAppInstance } from "../../../test";

export default function run(app: TestAppInstance) {
  describe("Http connections (integration)", () => {
    describe("http", () => {
      httpDontMergeIgnored(app);
      httpHttpMethods(app);
      httpMergeResults(app);
      httpMustNotOverwriteJsonWithString(app);
      httpRollsback(app);
      httpMapsBody(app);
      httpMapsHeaders(app);
      httpUrlEncodedRequests(app);
    });

    describe("redis", () => {
      redisDontMergeIgnored(app);
      redisHttpMethods(app);
      redisMergeResults(app);
      redisMustNotOverwriteJsonWithString(app);
      redisRollsback(app);
      redisShowGenericErrors(app);
      redisMapsBody(app);
      redisMapsHeaders(app);
    });
  });
}
