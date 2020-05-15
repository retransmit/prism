import { IRouterContext } from "koa-router";
import * as configModule from "../config";
import { authenticate } from "../domain/account";
import { setCookie } from "../utils/cookie";
import { ensureJwt } from "./lib/authUtils";

const config = configModule.get();

export function createHandler(method: string) {
  return async function handler(ctx: IRouterContext) {
    return config.jwt && config.jwt.required
      ? await ensureJwt(ctx, async (jwt, args) => {
          return processRequest();
        })
      : processRequest();

    async function processRequest() {
      const channel = ctx.params.id;

      const channelConfig = config.channels[channel];

      return channelConfig
        ? await (async () => {
            const channelId = !channelConfig.numChannels
              ? channel
              : `${channel}${Math.floor(
                  Math.random() * channelConfig.numChannels
                )}`;
          })()
        : (ctx.body = {
            success: false,
            error: "Unknown channel.",
            errorCode: "UNKNOWN_CHANNEL",
          });
    }

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
  };
}
