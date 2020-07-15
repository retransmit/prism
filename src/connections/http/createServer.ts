import { createServer as httpCreateServer } from "http";
import { Server as HttpServer } from "http";
import { createServer as httpsCreateServer } from "https";
import { Server as HttpsServer } from "https";
import { AppConfig } from "../../types";
import { requestHandler } from ".";

export default function createServer(config: AppConfig) {
  let httpServer: HttpServer | HttpsServer;

  // Create the HttpServer
  if (config.useHttps) {
    const options = {
      key: config.useHttps.key,
      cert: config.useHttps.cert,
      ca: config.useHttps.ca,
    };
    httpServer = (config.createHttpsServer || httpsCreateServer)(
      options,
      requestHandler
    );
  } else {
    httpServer = (config.createHttpServer || httpCreateServer)(requestHandler);
  }

  return httpServer;
}
