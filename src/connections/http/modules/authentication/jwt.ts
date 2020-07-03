import jsonwebtoken = require("jsonwebtoken");
import { HttpServiceJwtAuthentication, HttpRequest } from "../../../../types";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceJwtAuthentication
): Promise<{ status: number; body: any } | undefined> {
  const jwtString = authConfig.getJwt
    ? authConfig.getJwt(request)
    : authConfig.jwtHeaderField
    ? request.headers?.[authConfig.jwtHeaderField]
    : authConfig.jwtBodyField
    ? request.body?.[authConfig.jwtBodyField]
    : request.headers?.["authorization"] &&
      request.headers?.["authorization"].startsWith("Bearer ")
    ? request.headers?.["authorization"].split(" ")[1]
    : undefined;

  if (!jwtString) {
    return unauthorizedResponse(authConfig);
  }

  try {
    const jwt = jsonwebtoken.verify(
      jwtString,
      authConfig.key,
      authConfig.verifyOptions
    );

    if (authConfig.verify) {
      const verificationResult = await authConfig.verify(jwt);
      if (!verificationResult) {
        return unauthorizedResponse(authConfig);
      }
    }
  } catch (ex) {
    return unauthorizedResponse(authConfig);
  }
}

function unauthorizedResponse(authConfig: HttpServiceJwtAuthentication) {
  return {
    status: authConfig.errorStatus || 401,
    body: authConfig.errorResponse || "Unauthorized.",
  };
}
