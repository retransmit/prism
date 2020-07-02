import jsonwebtoken = require("jsonwebtoken");
import { HttpServiceJwtAuthentication, HttpRequest } from "../../../../types";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceJwtAuthentication
): Promise<{ status: number; body: any } | undefined> {
  const jwtString = authConfig.jwtHeaderField
    ? request.headers?.[authConfig.jwtHeaderField]
    : authConfig.jwtBodyField
    ? request.body?.[authConfig.jwtBodyField]
    : undefined;

  if (!jwtString) {
    return unauthorizedResponse(authConfig);
  }

  const jwt = jsonwebtoken.verify(jwtString, authConfig.publicKey);

  if (authConfig.verify) {
    const verificationResult = await authConfig.verify(jwt);
    if (!verificationResult) {
      return unauthorizedResponse(authConfig);
    }
  }
}

function unauthorizedResponse(authConfig: HttpServiceJwtAuthentication) {
  return {
    status: authConfig.errorStatus || 401,
    body: authConfig.errorResponse || "Unauthorized.",
  };
}
