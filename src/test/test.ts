import "mocha";
import "should";
import serviceTest from "./serviceTest";

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  if (!process.env.PORT) {
    throw new Error("The port should be specified in process.env.PORT");
  }

  if (!process.env.CONFIG_DIR) {
    throw new Error(
      "The configuration directory should be specified in process.env.CONFIG_DIR"
    );
  }

  const port = parseInt(process.env.PORT);
  const configDir = process.env.CONFIG_DIR;

  describe("border-patrol", () => {
    before(async function resetEverything() {});

    beforeEach(async function resetBeforeEach() {});

    // serviceTest(dbConfig, port, configDir);
  });
}

run();
