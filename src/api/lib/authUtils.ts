import { IRouterContext } from "koa-router";
import { IVerifiedValidJwt, verify } from "../../utils/jwt";

export async function ensureJwt(
  ctx: IRouterContext,
  then: (verifiedJwt: IVerifiedValidJwt, args: { jwt: string }) => Promise<any>
) {
  const jwt: string = ctx.headers["border-patrol-jwt"];

  return !jwt
    ? /* JWT was missing */
      ((ctx.status = 400),
      (ctx.body =
        "Missing JWT token in request. Pass via cookies or in the header."))
    : await (async () => {
        const result = verify(jwt);
        return !result.valid
          ? /* Invalid JWT */
            ((ctx.status = 400), (ctx.body = "Invalid JWT token."))
          : await then(result, {
              jwt,
            });
      })();
}

export async function ensureUserId(
  ctx: IRouterContext,
  then: (
    userId: string,
    verifiedJwt: IVerifiedValidJwt,
    args: { jwt: string }
  ) => Promise<any>
) {
  return ensureJwt(ctx, async (verfiedJwt, args) => {
    const userId = verfiedJwt.value.userId;
    return !userId
      ? ((ctx.status = 400),
        (ctx.body = "User id was not found in the JWT token."))
      : await then(userId, verfiedJwt, args);
  });
}
