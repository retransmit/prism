import "mocha";
import "should";

import httpHttpMethods from "./plugins/http/httpMethods";
import httpMergeResults from "./plugins/http/mergeResults";
import httpDontMergeIgnored from "./plugins/http/dontMergeIgnored";
import httpMustNotOverwriteJsonWithString from "./plugins/http/mustNotOverwriteJsonWithString";
import httpRollsback from "./plugins/http/rollsback";
import httpMapsBodyFields from "./plugins/http/mapsBodyFields";
import httpExcludesBodyFields from "./plugins/http/excludesBodyFields";
import httpMapsHeaders from "./plugins/http/mapsHeaders";
import httpExcludesHeaders from "./plugins/http/excludesHeaders";
import httpUrlEncodedRequests from "./plugins/http/urlEncodedRequests";
import httpRedirect from "./plugins/http/redirect";
import httpRunsStages from "./plugins/http/runsStages";

import redisHttpMethods from "./plugins/redis/httpMethods";
import redisMergeResults from "./plugins/redis/mergeResults";
import redisDontMergeIgnored from "./plugins/redis/dontMergeIgnored";
import redisShowGenericErrors from "./plugins/redis/showGenericErrors";
import redisMustNotOverwriteJsonWithString from "./plugins/redis/mustNotOverwriteJsonWithString";
import redisRollsback from "./plugins/redis/rollsback";
import redisMapsBodyFields from "./plugins/redis/mapsBodyFields";
import redisExcludesBodyFields from "./plugins/redis/excludesBodyFields";
import redisExcludesHeaders from "./plugins/redis/excludesHeaders";
import redisMapsHeaders from "./plugins/redis/mapsHeaders";

import rateLimits from "./rateLimits";
import tripsCircuit from "./tripsCircuit";
import runsWebJobs from "./runsWebJobs";

import { TestAppInstance } from "../../../test";

export default function run(app: TestAppInstance) {
  describe("Http connections (integration)", () => {
    describe("http", () => {
      httpDontMergeIgnored(app);
      httpHttpMethods(app);
      httpMergeResults(app);
      httpMustNotOverwriteJsonWithString(app);
      httpRollsback(app);
      httpMapsBodyFields(app);
      httpExcludesBodyFields(app);
      httpMapsHeaders(app);
      httpExcludesHeaders(app);
      httpUrlEncodedRequests(app);
      httpRedirect(app);
      httpRunsStages(app);
    });

    describe("redis", () => {
      redisDontMergeIgnored(app);
      redisHttpMethods(app);
      redisMergeResults(app);
      redisMustNotOverwriteJsonWithString(app);
      redisRollsback(app);
      redisShowGenericErrors(app);
      redisMapsBodyFields(app);
      redisExcludesBodyFields(app);
      redisExcludesHeaders(app);
      redisMapsHeaders(app);
    });

    describe("rate limiting", () => {
      rateLimits(app);
    });
    describe("circuit breaker", () => {
      tripsCircuit(app);
    });
    describe("web jobs", () => {
      runsWebJobs(app);
    });
  });
}
