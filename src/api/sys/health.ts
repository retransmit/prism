import { IRouterContext } from "koa-router";

export async function health(ctx: IRouterContext) {
  ctx.body = {
    success: true,
  };
}
