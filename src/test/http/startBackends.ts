import Koa = require("koa");

type MockHttpBackendConfig = {
  port: number;
  routes: {
    path: string;
    method: string;
    response: string | { [key: string]: any };
  }[];
};

export default function startBackends(configs: MockHttpBackendConfig[]) {
  const apps = [];
  for (const config of configs) {
    const koa = new Koa();

    // response

    koa.use((ctx) => {
      for (const route of config.routes) {
        if (ctx.path === route.path && ctx.method === route.method) {
          ctx.body = route.response;
          break;
        }
      }
    });

    const app = koa.listen(config.port);
    apps.push(app);
  }
  return apps;
}
