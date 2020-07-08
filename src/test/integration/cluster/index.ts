import basicRequest from "./basicRequest";
import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import { closeHttpServer } from "../../../utils/http/closeHttpServer";
import { TestEnv } from "../../test";

export type TestAppInstance = {
  mockHttpServers?: (HttpServer | HttpsServer)[];
};

export default async function run(testEnv: TestEnv) {
  describe("cluster", () => {
    let app: TestAppInstance = {
      mockHttpServers: undefined,
    };

    beforeEach(async () => {});

    afterEach(async function resetAfterEach() {
      if (app.mockHttpServers) {
        for (const mockHttpServer of app.mockHttpServers) {
          await closeHttpServer(mockHttpServer);
        }
      }
    });

    basicRequest(app, testEnv);
  });
}
