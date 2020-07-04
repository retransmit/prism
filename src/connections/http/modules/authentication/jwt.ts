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
    throw new Error("Missing JWT.");
  }

  let jwt: string | object;

  try {
    jwt = jsonwebtoken.verify(
      jwtString,
      authConfig.key,
      authConfig.verifyOptions
    );

    if (authConfig.verify) {
      const verificationResult = await authConfig.verify(jwt, request);
      if (!verificationResult) {
        throw new Error("Custom verification returned false.");
      }
    }
  } catch (ex) {
    return unauthorizedResponse(authConfig, ex, request);
  }
}

function unauthorizedResponse(
  authConfig: HttpServiceJwtAuthentication,
  error: any,
  request: HttpRequest
) {
  if (authConfig.onError) {
    authConfig.onError(error, request);
  }
  return {
    status: authConfig.errorStatus || 401,
    body: authConfig.errorBody || "Unauthorized.",
  };
}
