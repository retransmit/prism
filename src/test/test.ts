import "mocha";
import "should";
import serviceTest from "./serviceTest";
import domainTest from "./domainTest";
import { join } from "path";
import { IDbConfig } from "psychopiggy";
import { readFileSync } from "fs";
import { Pool } from "pg";

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

  const dbConfig: IDbConfig = require(join(configDir, "pg.js"));

  /* Sanity check to make sure we don't accidentally overwrite any database. */
  if (!dbConfig.database.startsWith("testdb")) {
    throw new Error("Test database name needs to be prefixed 'testdb'.");
  }

  describe("border-patrol", () => {
    before(async function resetDb() {
      const pool = new Pool({ ...dbConfig, database: "template1" });

      const { rows: existingDbRows } = await pool.query(
        `SELECT 1 AS result FROM pg_database WHERE datname='${dbConfig.database}'`
      );

      if (existingDbRows.length) {
        await pool.query(`DROP DATABASE ${dbConfig.database}`);
      }

      await pool.query(`CREATE DATABASE ${dbConfig.database}`);
    });

    /* Flush all the tables before each test */
    beforeEach(async function resetTables() {
      const pool = new Pool(dbConfig);

      const dropTablesSQL = readFileSync(
        join(__dirname, "../../db/drop-tables.sql")
      ).toString();

      const createTablesSQL = readFileSync(
        join(__dirname, "../../db/create-tables.sql")
      ).toString();

      await pool.query(dropTablesSQL);
      await pool.query(createTablesSQL);
    });

    serviceTest(dbConfig, port, configDir);
    domainTest(dbConfig, configDir);
  });
}

run();
