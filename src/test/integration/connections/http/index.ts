import handlesWildcardRotues from "./routing/wildcardRoutes";
import handlesParams from "./routing/params";

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
import httpStreams from "./plugins/http/streams";

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
import cachesResponses from "./cachesResponses";
import authenticates from "./authenticates";
import { TestAppInstance } from "..";

export default function run(app: TestAppInstance) {
  describe("http connections", () => {
    describe("routing", () => {
      handlesParams(app);
      handlesWildcardRotues(app);
    });
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
      httpStreams(app);
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
    describe("caching", () => {
      cachesResponses(app);
    });
    describe("authentication", () => {
      authenticates(app);
    });
  });
}
