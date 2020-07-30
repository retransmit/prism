import { startBackends } from "../../../../../../utils/http";
import { HttpMethods } from "../../../../../../../types/http";
const { argv } = require("yargs");

export default function startPerfTestBackends() {
  const responseSize = argv?.simpleRequest?.responseSize
    ? parseInt(argv?.simpleRequest?.responseSize)
    : undefined;

  // Start mock servers.
  const helloWorld = "hello, world";
  const responseText = responseSize
    ? helloWorld.repeat(Math.floor(responseSize / helloWorld.length) + 1)
    : helloWorld;

  const backends = startBackends([
    {
      port: 6666,
      routes: (["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethods[]).map(
        (method) => ({
          path: "/users",
          method,
          handleResponse: async (ctx) => {
            ctx.body = responseText;
          },
        })
      ),
    },
  ]);

  return backends;
}
