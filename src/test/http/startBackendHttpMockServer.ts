import Koa = require("koa");

export default function startServer(port: number) {
  const app = new Koa();

  // response
  app.use((ctx) => {
    ctx.body = "Everything worked."
  });

  app.listen(port);
}
