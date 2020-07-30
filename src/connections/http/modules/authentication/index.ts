import jwt from "./jwt";
import { HttpRequest } from "../../../../types/http";
import { HttpServiceAuthentication } from "../../../../types/httpServiceAuthentication";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceAuthentication | undefined
): Promise<{ status: number; body: any } | undefined> {
  if (authConfig) {
    if (authConfig.type === "jwt") {
      return await jwt(request, authConfig);
    }
  }
}
