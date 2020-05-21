import ClientRequestContext from "./ClientRequestContext";
import { IRouterContext } from "koa-router";
import { HttpMethods } from "../types";

export default class HttpRequestContext extends ClientRequestContext {
  ctx: IRouterContext;

  constructor(ctx: IRouterContext) {
    super();
    this.ctx = ctx;
  }

  getPath(): string {
    return this.ctx.path;
  }

  getParams(): { [key: string]: string } {
    return this.ctx.params;
  }

  getMethod(): HttpMethods {
    return this.ctx.method as HttpMethods;
  }

  getQuery(): { [key: string]: string } {
    return this.ctx.query;
  }

  getRequestHeaders(): { [key: string]: string } {
    return this.ctx.headers;
  }

  getRequestBody() {
    return this.ctx.body;
  }

  getRequestCookie(name: string): string | undefined {
    return this.ctx.cookies.get(name);
  }

  getResponseStatus(): number {
    return this.ctx.status;
  }

  setResponseStatus(status: number): void {
    this.ctx.status = status;
  }

  getResponseBody() {
    return this.ctx.body;
  }

  setResponseBody(value: any): void {
    this.ctx.body = value;
  }

  getResponseHeader(field: string): string {
    return this.ctx.response.get(field);
  }

  setResponseHeader(field: string, value: string | string[]): void {
    this.ctx.response.set(field, value);
  }

  getResponseType(): string {
    return this.ctx.type;
  }

  setResponseType(type: string): void {
    this.ctx.type = type;
  }

  getCookie(name: string): string | undefined {
    return this.ctx.cookies.get(name);
  }

  setCookie(
    name: string,
    value: string,
    opts?:
      | {
          path?: string | undefined;
          domain?: string | undefined;
          secure?: boolean | undefined;
          httpOnly?: boolean | undefined;
          maxAge?: number | undefined;
          overwrite?: boolean | undefined;
        }
      | undefined
  ): void {
    this.ctx.cookies.set(name, value, opts);
  }

  redirect(where: string): void {
    this.ctx.redirect(where);
  }
}
