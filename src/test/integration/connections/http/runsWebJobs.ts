import { startBackends } from "../../../utils/http";
import { TestAppInstance } from "..";
import { UserAppConfig } from "../../../../types";
import startRetransmitTestInstance from "../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../..";

function sleep(ms: number): Promise<void> {
  return new Promise((success) => {
    setTimeout(success, ms);
  });
}

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  const config: UserAppConfig = {
    webJobs: {
      cleanupusers: {
        type: "periodic",
        url: "http://localhost:6666/cleanup",
        interval: 50,
      },
    },
  };

  it("runs webjobs", async () => {
    const appControl = await startRetransmitTestInstance({ config });

    let callCount = 0;
    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/cleanup",
            method: "GET",
            handleResponse: async (ctx) => {
              callCount++;
              ctx.body = "hello, world";
            },
          },
        ],
      },
    ]);

    app.appControl = appControl;
    app.mockHttpServers = backendApps;

    await sleep(500);

    callCount.should.be.greaterThan(5);
  });
}
