import jsonwebtoken = require("jsonwebtoken");
import {
  HttpServiceJwtAuthentication,
  HttpRequest,
  HttpServiceAuthentication,
} from "../../../../types";
import jwt from "./jwt";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceAuthentication | undefined
): Promise<{ status: number; body: any } | undefined> {
  if (authConfig && authConfig !== "none") {
    if (authConfig.type === "jwt") {
      return await jwt(request, authConfig);
    }
  }
}

function unauthorizedResponse(authConfig: HttpServiceJwtAuthentication) {
  return {
    status: authConfig.errorStatus || 401,
    body: authConfig.errorResponse || "Unauthorized.",
  };
}
