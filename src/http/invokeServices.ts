import { HttpMethods, RouteConfig, IAppConfig, FetchedResult } from "../types";

/*
  Calls HTTP Services
*/
function getPromisesForHttpServices(
  requestId: string,
  path: string,
  method: HttpMethods,
  routeConfig: RouteConfig,
  config: IAppConfig
): Promise<FetchedResult>[] {
  // We'll have to individually call all the HTTP services
  // const httpServices = Object.keys(routeConfig.services).filter(
  //   (service) => typeof routeConfig.services[service].url !== "undefined"
  // );
  return [];
}
