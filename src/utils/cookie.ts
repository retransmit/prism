import * as configModule from "../config";
import { IRouterContext } from "koa-router";

export function setCookie(ctx: IRouterContext, name: string, value: string) {
  const config = configModule.get();
  ctx.cookies.set(name, value, {
    domain: config.domain,
    httpOnly: false,
    maxAge: config.cookies.maxAge,
    overwrite: true,
  });
}

export function setTempCookie(
  ctx: IRouterContext,
  name: string,
  value: string
) {
  const config = configModule.get();
  ctx.cookies.set(name, value, {
    domain: config.domain,
    httpOnly: false,
    overwrite: true,
  });
}

export function clearCookie(ctx: IRouterContext, name: string) {
  const config = configModule.get();
  ctx.cookies.set(name, "", {
    domain: config.domain,
    httpOnly: false,
    overwrite: true,
  });
}
