import "mocha";
import "should";

import integrationTests from "./integration";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  describe("retransmit", () => {
    integrationTests();
  });
}

run();
