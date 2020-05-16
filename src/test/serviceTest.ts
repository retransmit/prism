import { startApp } from "..";
import request = require("supertest");

let app: any;

export default function run(port: number, configDir: string) {
  describe("service", async () => {
    let app: any;

    before(async () => {
      const service = await startApp(port, configDir);
      app = service.listen();
    });

    it("does something...", async () => {});
  });
}
