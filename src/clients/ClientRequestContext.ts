import { HttpMethods } from "../types";

export default abstract class ClientRequestContext {
  abstract getRequestPath(): string;

  abstract getRequestParams(): {
    [key: string]: string;
  };

  abstract getRequestMethod(): HttpMethods;

  abstract getRequestQuery(): {
    [key: string]: string;
  };

  abstract getRequestHeaders(): {
    [key: string]: string;
  };
  
  abstract getRequestBody(): any;
  
  abstract getResponseStatus(): number;
  abstract setResponseStatus(status: number): void;

  abstract getResponseBody(): any;
  abstract setResponseBody(value: any): void;

  abstract getResponseHeader(field: string): string;
  abstract setResponseHeader(field: string, value: string | string[]): void;

  abstract getResponseType(): string;
  abstract setResponseType(type: string): void;


  abstract getCookie(name: string): string | undefined; 
  abstract setCookie(
    name: string,
    value: string,
    opts?: {
      path?: string;
      domain?: string;
      secure?: boolean;
      httpOnly?: boolean;
      maxAge?: number;
      overwrite?: boolean;
    }
  ): void;

  abstract redirect(where: string): void;
}
