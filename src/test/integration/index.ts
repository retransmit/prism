import connectionTypeTests from "./connections";

export default function run() {
  describe("integration", () => {
    connectionTypeTests();
  });
}
