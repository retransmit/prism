// import Koa = require("koa");
// import { HttpMethods } from "../../../../../../types";

// type MockHttpBackendConfig = {
//   port: number;
//   afterResponse?: (ctx: any) => Promise<boolean | undefined>;
//   routes: {
//     path: string;
//     method: HttpMethods;
//     response: {
//       status?: number;
//       body: string | { [key: string]: any };
//     };
//   }[];
// };

// export default function startBackends(configs: MockHttpBackendConfig[]) {
//   const apps = [];
//   for (const config of configs) {
//     const koa = new Koa();

//     koa.use(async (ctx) => {
//       const handled = config.afterResponse
//         ? await config.afterResponse(ctx)
//         : false;
//       if (!handled) {
//         for (const route of config.routes) {
//           if (ctx.path === route.path && ctx.method === route.method) {
//             if (route.response.status) {
//               ctx.status = route.response.status;
//             }
//             ctx.body = route.response.body;
//             break;
//           }
//         }
//       }
//     });

//     const app = koa.listen(config.port);
//     apps.push(app);
//   }
//   return apps;
// }
