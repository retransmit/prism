import * as configModule from "./config";
import { RequestData, ServiceResult, RouteConfig } from "./types";

export async function processResult(
  activeRequest: RequestData,
  routeConfig: RouteConfig,
  serviceResult: ServiceResult
) {
  const config = configModule.get();
  const resultHandler =
    (config.handlers && config.handlers.result) ||
    (routeConfig.handlers && routeConfig.handlers.result);

  const processingTime = Date.now() - activeRequest.startTime;

  if (serviceResult.success) {
    const fetchedResult = {
      time: processingTime,
      ignore: false,
      path: activeRequest.path,
      method: activeRequest.method,
      service: activeRequest.service,
      serviceResult: serviceResult,
    };
    activeRequest.onSuccess(
      resultHandler ? await resultHandler(fetchedResult) : fetchedResult
    );
  } else {
    const routeConfig = config.routes[activeRequest.path][
      activeRequest.method
    ] as RouteConfig;
    if (routeConfig.services[activeRequest.service].abortOnError === false) {
      const fetchedResult = {
        time: processingTime,
        ignore: true as true,
        path: activeRequest.path,
        method: activeRequest.method,
        service: activeRequest.service,
      };
      activeRequest.onSuccess(
        resultHandler ? await resultHandler(fetchedResult) : fetchedResult
      );
    } else {
      const fetchedResult = {
        time: processingTime,
        ignore: false,
        path: activeRequest.path,
        method: activeRequest.method,
        service: activeRequest.service,
        serviceResult: serviceResult,
      };
      activeRequest.onError(
        resultHandler ? await resultHandler(fetchedResult) : fetchedResult
      );
    }
  }
}
