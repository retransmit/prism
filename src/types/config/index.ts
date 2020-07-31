import { ClientOpts } from "redis";
import * as httpModule from "http";
import * as httpsModule from "https";
import { WebJobConfig } from "./webJob";
import { CorsConfig } from "./cors";
import { HttpProxyConfig } from "./httpProxy";
import { WebSocketProxyConfig } from "./webSocketProxy";
import { ClientTrackingConfig } from "./clientTracking";

// Application Config
export type UserAppConfig = {
  hostNames?: [];
  silent?: boolean;
  instanceId?: string;
  workers?: number;
  http?: HttpProxyConfig;
  webSocket?: WebSocketProxyConfig;
  webJobs?: {
    [name: string]: WebJobConfig;
  };
  redis?: {
    options?: ClientOpts;
  };
  useHttps?: {
    key: string;
    cert: string;
    ca?: string[];
  };
  state?: "memory" | "redis";
  cors?: CorsConfig;
  clientTracking?: ClientTrackingConfig;
  createHttpsServer?: (
    options: httpsModule.ServerOptions,
    listener: httpModule.RequestListener
  ) => httpsModule.Server;
  createHttpServer?: (
    listener: httpModule.RequestListener
  ) => httpModule.Server;
};

/*
  AppConfig is kind of the same as UserAppConfig.
  But we make a few things mandatory.
*/
export type AppConfig = UserAppConfig & {
  instanceId: string;
  workers: number;
  silent: boolean;
  hostId: string;
  state: "memory" | "redis";
};

export type HttpProxyAppConfig = AppConfig & { http: HttpProxyConfig };

export type WebSocketProxyAppConfig = AppConfig & {
  webSocket: WebSocketProxyConfig;
};

export type UrlList = string | string[];
export type UrlSelector = (urlList: UrlList) => Promise<UrlList>;
