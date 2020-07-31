import { HttpProxyAppConfig } from "../../../../types/config";
import { createHash } from "crypto";
import { HttpResponse, HttpRequest } from "../../../../types/http";
import { HttpProxyCacheConfig } from "../../../../types/config/httpProxy/caching";
import plugins from "./plugins";
import getRouteConfig from "../../getRouteConfig";

/*
  Cache state is stored in memory by default,
  but production should use redis.
*/
export async function getFromCache(
  route: string,
  request: HttpRequest,
  config: HttpProxyAppConfig
): Promise<HttpResponse | undefined> {
  const routeConfig = getRouteConfig(route, request, config);
  const cacheConfig = routeConfig.caching || config.http.caching;

  if (cacheConfig) {
    const key = reduceRequestToHash(route, request, cacheConfig);
    return await plugins[config.state].get(key, cacheConfig, config);
  }
}

export async function updateCache(
  route: string,
  request: HttpRequest,
  response: HttpResponse,
  config: HttpProxyAppConfig
) {
  const routeConfig = getRouteConfig(route, request, config);
  const cacheConfig = routeConfig.caching || config.http.caching;

  if (cacheConfig) {
    const maxSize = cacheConfig.maxSize || 5000000;

    // Check if any of the params are bigger than it should be.
    if (!tooBig(maxSize, response)) {
      const key = reduceRequestToHash(route, request, cacheConfig);
      return await plugins[config.state].set(
        key,
        response,
        cacheConfig,
        config
      );
    }
  }
}

function reduceRequestToHash(
  route: string,
  request: HttpRequest,
  cacheConfig: HttpProxyCacheConfig
) {
  const requestParams = {
    headers: requestFieldToArray(
      request.headers,
      cacheConfig.varyBy?.headers || []
    ),
    query: requestFieldToArray(
      request.headers,
      cacheConfig.varyBy?.query || []
    ),
    body: requestFieldToArray(request.headers, cacheConfig.varyBy?.body || []),
  };

  const jsonOfRequest = JSON.stringify(requestParams);
  const hashOfRequest = createHash("sha1")
    .update(jsonOfRequest)
    .digest("base64");

  return `${route}:${request.method}:${hashOfRequest}`;
}

function requestFieldToArray(
  requestProp:
    | {
        [field: string]: any;
      }
    | undefined,
  fields: string[] | undefined
) {
  return (fields || []).reduce((acc, prop) => {
    return acc.concat(requestProp ? [[prop, requestProp[prop]]] : []);
  }, [] as [string, any][]);
}

function tooBig(maxSize: number, response: HttpResponse) {
  return [response.headers, response.body].some((responseProp) => {
    responseProp !== undefined
      ? Object.keys(responseProp).some(
          (x) =>
            (typeof responseProp === "string"
              ? x
              : JSON.stringify(responseProp[x])
            ).length > maxSize
        )
      : false;
  });
}
