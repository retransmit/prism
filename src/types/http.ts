import { IncomingHttpHeaders } from "http2";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

// Http Requests and Responses
export type BodyObject = {
  [field: string]: any;
};

export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string;
  };
  body?: string | Buffer | BodyObject | Array<any> | undefined;
  headers?: HttpHeaders;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type HttpHeaders = {
  [key: string]: string | string[];
};

export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: HttpCookie[];
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | BodyObject | Array<any> | undefined;
  contentType?: string;
};

export type HttpCookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  overwrite?: boolean;
};
