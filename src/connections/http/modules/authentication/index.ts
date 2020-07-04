import {
  HttpRequest,
  HttpServiceAuthentication,
} from "../../../../types";
import jwt from "./jwt";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceAuthentication | "none" | undefined
): Promise<{ status: number; body: any } | undefined> {
  if (authConfig && authConfig !== "none") {
    if (authConfig.type === "jwt") {
      return await jwt(request, authConfig);
    }
  }
}
