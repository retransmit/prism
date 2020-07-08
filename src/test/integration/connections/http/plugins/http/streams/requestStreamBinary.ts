import { startBackends } from "../../../../../../utils/http";
import { TestAppInstance } from "../../../../../../test";
import got from "got";
import { UserAppConfig } from "../../../../../../../types";
import { join } from "path";
import { createWriteStream, statSync } from "fs";
import { pipeline } from "stream";
import startTestApp from "../../../../../../startTestApp";

export default async function (app: TestAppInstance) {
  it(`handles a stream with binary response`, async () => {
    const outputFile = join(__dirname, "pic.jpg");

    const config: UserAppConfig = {
      http: {
        routes: {
          "/images/(.*)": {
            GET: {
              useStream: true,
              services: {
                imageservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/images/:0",
                },
              },
            },
          },
        },
      },
    };

    const servers = await startTestApp({ config });

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        static: {
          baseUrl: "/images",
          dirPath: join(__dirname, "../../../../../../fixtures/static"),
        },
      },
    ]);

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    const { port } = app.servers.httpServer.address() as any;
    const requestStream = got.stream(
      `http://localhost:${port}/images/sandman.jpg`,
      {
        method: "GET",
        retry: 0,
      }
    );

    const { statusCode, contentType } = await new Promise((success) => {
      requestStream.on("response", (response) => {
        success({
          statusCode: response.statusCode,
          contentType: (response.headers as any)["content-type"],
        });
      });
    });

    statusCode.should.equal(200);
    contentType.should.equal("image/jpeg");
    await new Promise((success) => {
      pipeline(requestStream, createWriteStream(outputFile), success);
    });

    const sizeOfPic = statSync(outputFile);
    sizeOfPic.size.should.equal(42011);
  });
}
