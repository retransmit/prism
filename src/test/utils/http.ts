import { promisify } from "util";
import { Server } from "http";
import Koa = require("koa");
import { CancelableRequest } from "got/dist/source";
import { Response } from "got/dist/source/core";
import bodyParser = require("koa-body");
import { HttpMethods } from "../../types";

function closeHttpServerCb(server: Server, cb: any) {
  (server as any).close(cb);
}

const promisifiedCloseHttpServer = promisify(closeHttpServerCb);

export async function closeHttpServer(server: Server) {
  await promisifiedCloseHttpServer(server);
}

type MockHttpBackendConfig = {
  port: number;
  afterResponse?: (ctx: any) => Promise<boolean | undefined>;
  routes: {
    path: string;
    method: HttpMethods;
    handleResponse?: (
      ctx: Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext>
    ) => Promise<void>;
    response?: {
      status?: number;
      body: string | { [key: string]: any };
    };
  }[];
};

export function startBackends(configs: MockHttpBackendConfig[]) {
  const apps = [];
  for (const config of configs) {
    const koa = new Koa();

    koa.use(bodyParser());
    koa.use(async (ctx) => {
      const handled = config.afterResponse
        ? await config.afterResponse(ctx)
        : false;
      if (!handled) {
        for (const route of config.routes) {
          if (ctx.path === route.path && ctx.method === route.method) {
            if (route.handleResponse) {
              await route.handleResponse(ctx);
            } else {
              if (route.response) {
                if (route.response.status) {
                  ctx.status = route.response.status;
                }
                ctx.body = route.response.body;
                break;
              }
            }
          }
        }
      }
    });

    const app = koa.listen(config.port);
    apps.push(app);
  }
  return apps;
}

export async function getResponse(
  promisedResponse: CancelableRequest<Response<string>>
): Promise<Response<string>> {
  try {
    return await promisedResponse;
  } catch (ex) {
    return ex.response;
  }
}
