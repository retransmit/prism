import requestStreamText from "./requestStreamText";
import requestStreamBinary from "./requestStreamBinary";
import { TestAppInstance } from "../../../..";

export default function run(app: TestAppInstance) {
  describe("streams", () => {
    requestStreamText(app);
    requestStreamBinary(app);
  });
}
