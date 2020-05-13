import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";
import { withTransaction, getPool } from "../../db";
import * as pg from "psychopiggy";
import { sign } from "../../utils/jwt";

const pbkdf2Func = promisify(pbkdf2);

export async function authenticate(
  userId: string,
  password: string
): Promise<boolean> {
  const pool = getPool();

  const params = new pg.Params({ user_id: userId });

  const { rows } = await pool.query(
    `SELECT user_id, salt, hash FROM "user" WHERE id=${params.id("user_id")}`,
    params.values()
  );

  return rows.length === 0
    ? false
    : await (async () => {
        const [{ user_id, salt, hash }] = rows;
        var calculatedHash = await (
          await pbkdf2Func(password, salt, 1000, 64, "sha256")
        ).toString();
        return calculatedHash === hash;
      })();
}

export async function createLocalUser(userId: string, password: string) {
  var salt = randomBytes(128).toString("base64");
  var hash = await (
    await pbkdf2Func(password, salt, 1000, 64, "sha256")
  ).toString();

  const txResult = await withTransaction(async (client) => {
    const insertAuthParams = new pg.Params({
      user_id: userId,
      salt,
      hash,
      algorithm: "sha256",
      timestamp: Date.now(),
    });

    await client.query(
      `INSERT INTO "local_user_auth" (${insertAuthParams.columns()}) VALUES (${insertAuthParams.ids()})`,
      insertAuthParams.values()
    );

    return true;
  });

  const tokenData = {
    userId: userId,
    providerUserId: userId,
    provider: "local",
  };

  return txResult.success
    ? {
        created: true as true,
        jwt: sign(tokenData),
        tokens: tokenData,
      }
    : {
        created: false as false,
        reason: "Could not create new local user.",
      };
}
