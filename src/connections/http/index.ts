import Koa = require("koa");
import bodyParser = require("koa-body");
import Router from "koa-router";
import { IncomingMessage } from "http";
import { ServerResponse } from "http";
import { HttpMethods, AppConfig } from "../../types";
import isHttpServiceAppConfig from "./isHttpServiceAppConfig";
import plugins from "./plugins";
import createHandler from "./createHandler";

const cors = require("@koa/cors");

export default async function initHttpHandling(config: AppConfig) {
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

    for (const pluginName of Object.keys(plugins)) {
      await plugins[pluginName].init(config);
    }

    const router = new Router();

    for (const route of Object.keys(config.http.routes)) {
      const methodConfig = config.http.routes[route];

      for (const method of Object.keys(methodConfig)) {
        const serviceConfig = methodConfig[method as HttpMethods];
        if (
          serviceConfig?.requestBodyIsStream ||
          serviceConfig?.requestBodyIsStream
        ) {
          if (Object.keys(serviceConfig.services).length > 1) {
            throw new Error(
              `The request or response for the route ${method} ${route} is defined as a stream but there are more than one services defined. This is not supported for now.`
            );
          }
        }
      }

      if (methodConfig.GET) {
        router.get(route, createHandler(route, methodConfig.GET, config));
      }

      if (methodConfig.POST) {
        if (
          methodConfig.POST.requestBodyIsStream ||
          methodConfig.POST.responseBodyIsStream
        ) {
          router.post(route, createHandler(route, methodConfig.POST, config));
        } else {
          router.post(
            route,
            bodyParser(),
            createHandler(route, methodConfig.POST, config)
          );
        }
      }

      if (methodConfig.PUT) {
        if (
          methodConfig.PUT.requestBodyIsStream ||
          methodConfig.PUT.responseBodyIsStream
        ) {
          router.put(route, createHandler(route, methodConfig.PUT, config));
        } else {
          router.put(
            route,
            bodyParser(),
            createHandler(route, methodConfig.PUT, config)
          );
        }
      }

      if (methodConfig.DELETE) {
        router.del(route, createHandler(route, methodConfig.DELETE, config));
      }

      if (methodConfig.PATCH) {
        if (
          methodConfig.PATCH.requestBodyIsStream ||
          methodConfig.PATCH.responseBodyIsStream
        ) {
          router.patch(route, createHandler(route, methodConfig.PATCH, config));
        } else {
          router.patch(
            route,
            bodyParser(),
            createHandler(route, methodConfig.PATCH, config)
          );
        }
      }

      if (methodConfig.ALL) {
        router.all(route, createHandler(route, methodConfig.ALL, config));
      }
    }

    koa.use(router.routes());
    koa.use(router.allowedMethods());
  }

  const koaRequestHandler = koa.callback();

  return function httpRequestHandler(
    req: IncomingMessage,
    res: ServerResponse
  ) {
    koaRequestHandler(req, res);
  };
}
