import { Response } from "got/dist/source/core";

export function isJson(serverResponse: Response<string>) {
  return (
    serverResponse.headers["content-type"]?.indexOf("application/json") !== -1
  );
}
