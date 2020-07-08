import "mocha";
import "should";

import integrationTests from "./integration";
import { join } from "path";

export type TestEnv = {
  appRoot: string;
  testRoot: string;
};

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  const testEnv = {
    appRoot: join(__dirname, "../"),
    testRoot: __dirname,
  };

  describe("retransmit", () => {
    integrationTests(testEnv);
  });
}

run();
