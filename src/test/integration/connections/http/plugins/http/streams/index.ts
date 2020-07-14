import requestStreamText from "./requestStreamText";
import requestStreamBinary from "./requestStreamBinary";
import { TestAppInstance } from "../../../..";
import { TestEnv } from "../../../../..";

export default function run(app: TestAppInstance, testEnv: TestEnv) {
  describe("streams", () => {
    requestStreamText(app, testEnv);
    requestStreamBinary(app, testEnv);
  });
}
