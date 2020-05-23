import { HttpResponse, HttpRequest, RedisServiceRequest } from ".";

/*
  Service Configuration
*/
export type ServiceConfigBase = {
  awaitResponse?: boolean;
  merge?: boolean;
  timeout?: number;
  mergeField?: string;
  onServiceResponse?: (
    response: HttpResponse | undefined
  ) => Promise<HttpResponse>;
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
    onServiceRequest?: (request: RedisServiceRequest) => Promise<any>;
    onRollbackRequest?: (request: RedisServiceRequest) => Promise<any>;
  };
} & ServiceConfigBase;

export type HttpServiceConfig = {
  type: "http";
  config: {
    url: string;
    rollbackUrl?: string;
    onServiceRequest?: (request: HttpRequest) => Promise<HttpRequest>;
    onRollbackRequest?: (request: HttpRequest) => Promise<HttpRequest>;
  };
} & ServiceConfigBase;

export type ServiceConfig =
  | RedisServiceConfig
  | HttpServiceConfig;
