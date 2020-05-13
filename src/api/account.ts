import { IRouterContext } from "koa-router";
import * as configModule from "../config";
import { authenticate } from "../domain/account";
import { sign } from "../utils/jwt";
import { setCookie } from "../utils/cookie";

export async function login(ctx: IRouterContext) {
  const config = configModule.get();

  const { userId, password } = ctx.body;
  const isValidLogin = await authenticate(userId, password);

  if (isValidLogin) {
    const tokenData = {
      userId,
      providerUserId: userId,
      provider: "local",
    };
    const jwt = sign(tokenData);

    setCookie(ctx, "my-jwt", jwt);

    ctx.body = {
      success: true,
      userId,
      jwt,
    };
  } else {
    ctx.body = {
      success: false,
    };
  }
}
