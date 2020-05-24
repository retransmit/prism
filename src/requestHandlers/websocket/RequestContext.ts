import { IRouterContext } from "koa-router";

export default class WebSocketRequestContext {
  #ctx: IRouterContext;

  constructor(ctx: IRouterContext) {
    this.#ctx = ctx;
  }
}
