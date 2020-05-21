import ClientRequestContext from "./ClientRequestContext";

export default class WebSocketRequestContext extends ClientRequestContext {
  getRequestPath(): string {
    throw new Error("Method not implemented.");
  }
  getRequestParams(): { [key: string]: string } {
    throw new Error("Method not implemented.");
  }
  getRequestMethod(): import("../types").HttpMethods {
    throw new Error("Method not implemented.");
  }
  getRequestQuery(): { [key: string]: string } {
    throw new Error("Method not implemented.");
  }
  getRequestHeaders(): { [key: string]: string } {
    throw new Error("Method not implemented.");
  }
  getRequestBody() {
    throw new Error("Method not implemented.");
  }
  getResponseStatus(): number {
    throw new Error("Method not implemented.");
  }
  setResponseStatus(status: number): void {
    throw new Error("Method not implemented.");
  }
  getResponseBody() {
    throw new Error("Method not implemented.");
  }
  setResponseBody(value: any): void {
    throw new Error("Method not implemented.");
  }

  getResponseHeader(field: string): string {
    throw new Error("Method not implemented.");
  }

  setResponseHeader(field: string, value: string | string[]): void {
    throw new Error("Method not implemented.");
  }
  getResponseType(): string {
    throw new Error("Method not implemented.");
  }
  setResponseType(type: string): void {
    throw new Error("Method not implemented.");
  }
  getCookie(name: string): string | undefined {
    throw new Error("Method not implemented.");
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
    throw new Error("Method not implemented.");
  }
  redirect(where: string): void {
    throw new Error("Method not implemented.");
  }
}
