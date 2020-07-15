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
import { TestEnv } from "../..";
import handlesHttps from "./handlesHttps";

export default function run(app: TestAppInstance, testEnv: TestEnv) {
  describe("http connections", () => {
    describe("routing", () => {
      handlesParams(app, testEnv);
      handlesWildcardRotues(app, testEnv);
    });
    describe("http", () => {
      httpDontMergeIgnored(app, testEnv);
      httpHttpMethods(app, testEnv);
      httpMergeResults(app, testEnv);
      httpMustNotOverwriteJsonWithString(app, testEnv);
      httpRollsback(app, testEnv);
      httpMapsBodyFields(app, testEnv);
      httpExcludesBodyFields(app, testEnv);
      httpMapsHeaders(app, testEnv);
      httpExcludesHeaders(app, testEnv);
      httpUrlEncodedRequests(app, testEnv);
      httpRedirect(app, testEnv);
      httpRunsStages(app, testEnv);
      httpStreams(app, testEnv);
    });

    describe("redis", () => {
      redisDontMergeIgnored(app, testEnv);
      redisHttpMethods(app, testEnv);
      redisMergeResults(app, testEnv);
      redisMustNotOverwriteJsonWithString(app, testEnv);
      redisRollsback(app, testEnv);
      redisShowGenericErrors(app, testEnv);
      redisMapsBodyFields(app, testEnv);
      redisExcludesBodyFields(app, testEnv);
      redisExcludesHeaders(app, testEnv);
      redisMapsHeaders(app, testEnv);
    });

    describe("rate limiting", () => {
      rateLimits(app, testEnv);
    });
    describe("circuit breaker", () => {
      tripsCircuit(app, testEnv);
    });
    describe("web jobs", () => {
      runsWebJobs(app, testEnv);
    });
    describe("caching", () => {
      cachesResponses(app, testEnv);
    });
    describe("authentication", () => {
      authenticates(app, testEnv);
    });
    describe("https", () => {
      handlesHttps(app, testEnv);
    });
  });
}
