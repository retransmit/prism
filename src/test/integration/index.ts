import connectionTypeTests from "./connections";
import clusterTests from "./cluster";
import { TestEnv } from "../test";

export default function run(testEnv: TestEnv) {
  describe("integration", () => {
    connectionTypeTests(testEnv);
    clusterTests(testEnv);
  });
}
