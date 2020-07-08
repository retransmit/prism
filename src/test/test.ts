import "mocha";
import "should";

import integrationTestsHttp from "./integration/connections/http";
import integrationTestsWebSocket from "./integration/connections/webSocket";

import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import { AppControl } from "..";
import { closeHttpServer } from "../utils/http/closeHttpServer";

export type TestAppInstance = {
  appControl?: AppControl;
  mockHttpServers?: (HttpServer | HttpsServer)[];
};

function run() {
  /* Sanity check to make sure we don't accidentally run on the server. */
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Tests can only be run with NODE_ENV=development.");
  }

  describe("retransmit", () => {
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

run();
