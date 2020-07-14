import { startBackends } from "../../../../../../utils/http";
import { TestAppInstance } from "../../../..";
import got from "got";
import { UserAppConfig } from "../../../../../../../types";
import { join } from "path";
import { createWriteStream, statSync } from "fs";
import { pipeline } from "stream";
import startRetransmitTestInstance from "../../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
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

    const appControl = await startRetransmitTestInstance({ config });

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        static: {
          baseUrl: "/images",
          dirPath: join(testEnv.testRoot, "fixtures/static"),
        },
      },
    ]);

    app.appControl = appControl;
    app.mockHttpServers = backendApps;

    const { port } = appControl;
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
