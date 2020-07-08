import "mocha";
import "should";

import integrationTests from "./integration";

export type TestEnv = {
  rootDir: string;
};

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  const testEnv = {
    rootDir: __dirname,
  };

  describe("retransmit", () => {
    integrationTests(testEnv);
  });
}

run();
