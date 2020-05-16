import { IRouterContext } from "koa-router";
import { ClientOpts } from "redis";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  cleanupIntervalMS?: number;
  requestChannel?: string;
  responseChannel?: string;
  routes: {
    [key: string]: {
      [key in HttpMethods]?: HandlerConfig;
    };
  };
  handlers?: {
    request?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    response?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  };
  redis?: {
    options: ClientOpts;
  };
}

/*
  RouteHandler Config
*/
export type HandlerConfig = {
  requestChannel?: string;
  responseChannel?: string;
  services: {
    [key: string]: {
      awaitResponse?: boolean;
      abortOnError?: boolean;
      timeoutMS?: number;
    };
  };
  numRequestChannels?: number;
};

/*
  This is the output of participating services.
*/
export type ServiceResult = {
  id: string;
  success: boolean;
  response?: HttpResponse;
};

/*
  Output from the queue
*/
export type ChannelResult =
  | {
      time: number;
      ignore: false;
      result: ServiceResult;
    }
  | {
      time: number;
      ignore: true;
    };

/*
  Result of collating results from services
*/
export type CollatedResult =
  | {
      aborted: false;
      results: ChannelResult[];
    }
  | { aborted: true; errorResult: ChannelResult };

/*
  Can be used to form an HttpResponse
*/
export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    overwrite?: boolean;
  }[];
  content?: any;
  contentType?: string;
};
