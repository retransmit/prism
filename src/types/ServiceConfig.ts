import { HttpResponse, HttpRequest, RedisServiceRequest } from ".";

/*
  Service Configuration
*/
export type ServiceConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
  onResponse?: (response: HttpResponse | undefined) => Promise<HttpResponse>;
  onError?: (
    response: HttpResponse | undefined,
    request: HttpRequest
  ) => Promise<void>;
};

export type RedisServiceConfig = {
  type: "redis";
  config: {
    requestChannel: string;
    responseChannel: string;
    numRequestChannels?: number;
    onRequest?: (
      request: RedisServiceRequest
    ) => Promise<
      | {
          handled: true;
          response: HttpResponse;
        }
      | { handled: false; request: RedisServiceRequest }
    >;
    onRollbackRequest?: (
      request: RedisServiceRequest
    ) => Promise<
      | {
          handled: true;
        }
      | { handled: false; request: RedisServiceRequest }
    >;
  };
} & ServiceConfigBase;

export type HttpServiceConfig = {
  type: "http";
  config: {
    url: string;
    rollbackUrl?: string;
    onRequest?: (
      request: HttpRequest
    ) => Promise<
      | {
          handled: true;
          response: HttpResponse;
        }
      | { handled: false; request: HttpRequest }
    >;
    onRollbackRequest?: (
      request: HttpRequest
    ) => Promise<
      | {
          handled: true;
        }
      | { handled: false; request: HttpRequest }
    >;
  };
} & ServiceConfigBase;

export type ServiceConfig = RedisServiceConfig | HttpServiceConfig;
