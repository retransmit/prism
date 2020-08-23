import { HttpProxyAppConfig } from "../../../../types/config";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";
import { publish } from "./publish";
import { HttpRequest, HttpMethods, RedisHttpRequest } from "../../../../types/http";

/*
  Make Promises for Redis Services.
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  config: HttpProxyAppConfig
) {
  const routeConfig = config.http.routes[route][method] as HttpRouteConfig;

  const alreadyPublishedChannels: string[] = [];

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "redis") {
      const redisHttpRequest: RedisHttpRequest = {
        id: requestId,
        request: request,
        type: "rollback",
      };

      if (!alreadyPublishedChannels.includes(serviceConfig.requestChannel)) {
        const onRollbackRequestResult = (serviceConfig.onRollbackRequest &&
          (await serviceConfig.onRollbackRequest(redisHttpRequest))) || {
          handled: false as false,
          request: JSON.stringify(redisHttpRequest),
        };

        if (!onRollbackRequestResult.handled) {
          alreadyPublishedChannels.push(serviceConfig.requestChannel);

          publish(serviceConfig.requestChannel, onRollbackRequestResult.request);
        }
      }
    }
  }
}
