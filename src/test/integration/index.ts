import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";

import { AppControl } from "../..";
import { closeHttpServer } from "../../utils/http/closeHttpServer";
import integrationTestsHttp from "./connections/http";
import integrationTestsWebSocket from "./connections/webSocket";

export type TestAppInstance = {
  appControl?: AppControl;
  mockHttpServers?: (HttpServer | HttpsServer)[];
};

export default function run() {
  describe("integration", () => {
    let app: TestAppInstance = {
      appControl: undefined,
      mockHttpServers: undefined,
    } as any;

    beforeEach(async () => {
      (app as any).appControl = undefined;
      app.mockHttpServers = undefined;
    });

    afterEach(async function resetAfterEach() {
      if (app.mockHttpServers) {
        for (const mockHttpServer of app.mockHttpServers) {
          await closeHttpServer(mockHttpServer);
        }
      }

      if (app.appControl) {
        await app.appControl.closeServers();
      }
    });

    integrationTestsHttp(app);
    integrationTestsWebSocket(app);
  });
}
