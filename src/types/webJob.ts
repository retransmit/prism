import { UrlList, UrlSelector } from ".";
import { HttpMethods, HttpRequest } from "./http";

type WebJobBase = {
  url: UrlList;
  getUrl?: UrlSelector;
  method?: HttpMethods;
  body?: any;
  payload?: HttpRequest;
  getPayload?: (url: string) => Promise<HttpRequest>;
};

export type PeriodicWebJob = {
  type: "periodic";
  interval: number;
} & WebJobBase;

export type CronWebJob = {
  type: "cron";
  expression: string;
} & WebJobBase;

export type WebJob = PeriodicWebJob | CronWebJob;