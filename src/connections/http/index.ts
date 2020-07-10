import Koa = require("koa");
import bodyParser = require("koa-body");
import Router from "koa-router";
import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import { HttpMethods, AppConfig } from "../../types";
import plugins from "./plugins";
import createHandlerForRoute from "./createHandlerForRoute";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import isHttpServiceAppConfig from "./isHttpServiceAppConfig";

const cors = require("@koa/cors");
let currentRequestHandler: KoaRequestHandler | undefined = undefined;

export async function init(config: AppConfig) {
  currentRequestHandler = await createKoaRequestHandler(config);
}

type KoaRequestHandler = (
  req: IncomingMessage | Http2ServerRequest,
  res: ServerResponse | Http2ServerResponse
) => Promise<void>;

async function createKoaRequestHandler(
  config: AppConfig
): Promise<KoaRequestHandler> {
  const koa = new Koa();

  if (config.cors) {
    koa.use(cors(config.cors));
  }

  if (isHttpServiceAppConfig(config)) {
    // Load other plugins.
    if (config.http.plugins) {
      for (const pluginName of Object.keys(config.http.plugins)) {
        plugins[pluginName] = require(config.http.plugins[pluginName].path);
      }
    }

    // Call init on all the plugins.
    for (const pluginName of Object.keys(plugins)) {
      await plugins[pluginName].init(config);
    }

    const router = new Router();

    for (const route of Object.keys(config.http.routes)) {
      const methodConfig = config.http.routes[route];

      for (const method of Object.keys(methodConfig)) {
        const serviceConfig = methodConfig[method as HttpMethods];
        if (serviceConfig?.useStream) {
          if (Object.keys(serviceConfig.services).length > 1) {
            throw new Error(
              `The request or response for the route ${method} ${route} is defined as a stream but there are more than one services defined. This is not supported for now.`
            );
          }
        }
      }

      if (methodConfig.GET) {
        router.get(
          route,
          createHandlerForRoute(route, methodConfig.GET, config)
        );
      }

      if (methodConfig.POST) {
        if (methodConfig.POST.useStream) {
          router.post(
            route,
            createHandlerForRoute(route, methodConfig.POST, config)
          );
        } else {
          router.post(
            route,
            bodyParser(),
            createHandlerForRoute(route, methodConfig.POST, config)
          );
        }
      }

      if (methodConfig.PUT) {
        if (methodConfig.PUT.useStream) {
          router.put(
            route,
            createHandlerForRoute(route, methodConfig.PUT, config)
          );
        } else {
          router.put(
            route,
            bodyParser(),
            createHandlerForRoute(route, methodConfig.PUT, config)
          );
        }
      }

      if (methodConfig.DELETE) {
        router.del(
          route,
          createHandlerForRoute(route, methodConfig.DELETE, config)
        );
      }

      if (methodConfig.PATCH) {
        if (methodConfig.PATCH.useStream) {
          router.patch(
            route,
            createHandlerForRoute(route, methodConfig.PATCH, config)
          );
        } else {
          router.patch(
            route,
            bodyParser(),
            createHandlerForRoute(route, methodConfig.PATCH, config)
          );
        }
      }

      if (methodConfig.ALL) {
        router.all(
          route,
          createHandlerForRoute(route, methodConfig.ALL, config)
        );
      }
    }
    koa.use(router.routes());
    koa.use(router.allowedMethods());
  }

  return koa.callback();
}

export function requestHandler(
  req: IncomingMessage | Http2ServerRequest,
  res: ServerResponse | Http2ServerResponse
) {
  if (currentRequestHandler) {
    currentRequestHandler(req, res);
  }
}
