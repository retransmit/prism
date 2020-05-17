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
  redis?: {
    options: ClientOpts;
  };
  handlers?: {
    result?: (result: FetchedResult) => Promise<FetchedResult>;
    request?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    response?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  };
  genericErrors?: boolean;
  logError?: (error: string) => Promise<void>;
}

/*
  RouteHandler Config
*/
export type HandlerConfig = {
  requestChannel?: string;
  responseChannel?: string;
  services: {
    [key: string]: ServiceHandlerConfig;
  };
  numRequestChannels?: number;
  handlers?: {
    result?: (result: FetchedResult) => Promise<FetchedResult>;
    merge?: (result: CollatedResult) => Promise<CollatedResult>;
    request?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    response?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  };
  genericErrors?: boolean;
  logError?: (error: string) => Promise<void>;
};

/*
  Service Configuration
*/
export type ServiceHandlerConfig = {
  awaitResponse?: boolean;
  merge?: boolean;
  abortOnError?: boolean;
  timeoutMS?: number;
  mergeField?: string;
};

/*
  This is the output of participating services.
*/
export type ServiceResult = {
  id: string;
  service: string;
  success: boolean;
  response?: HttpResponse;
};

/*
  Currently active requests
*/
export type RequestData = {
  id: string;
  path: string;
  channel: string;
  timeoutTicks: number;
  method: HttpMethods;
  service: string;
  startTime: number;
  onSuccess: (result: FetchedResult) => void;
  onError: (result: FetchedResult) => void;
};

/*
  Output of processMessages()
*/
export type FetchedResult =
  | {
      time: number;
      ignore: false;
      path: string;
      method: HttpMethods;
      service: string;
      serviceResult: ServiceResult;
    }
  | {
      path: string;
      method: HttpMethods;
      service: string;
      time: number;
      ignore: true;
    };

/*
  Result of collating results from services
*/
export type CollatedResult =
  | {
      aborted: false;
      results: FetchedResult[];
    }
  | { aborted: true; errorResult: FetchedResult };

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
