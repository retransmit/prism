import * as pg from "pg";
import * as psychopiggy from "psychopiggy";

let config: psychopiggy.IDbConfig;

export async function init(c: psychopiggy.IDbConfig) {
  if (!config) {
    psychopiggy.createPool(c);
    config = c;
  } else {
    throw "DB config has already been initialized.";
  }
}

export function getConfig() {
  return config;
}

export function getPool() {
  return psychopiggy.getPool(config);
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
) {
  return await psychopiggy.withTransaction(fn, config);
}
