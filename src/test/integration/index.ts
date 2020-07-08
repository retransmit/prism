import connectionTypeTests from "./connections";
import { TestEnv } from "../test";

export default function run(testEnv: TestEnv) {
  describe("integration", () => {
    connectionTypeTests(testEnv);
  });
}
