import jsonwebtoken = require("jsonwebtoken");
import { IAppConfig, HttpServiceJwtAuthentication } from "../../types";

export default async function validateJwt(
  jwtString: string | undefined,
  authConfig: HttpServiceJwtAuthentication
): Promise<{ status: number; body: any } | undefined> {
  function unauthorizedResponse() {
    return {
      status: authConfig.errorStatus || 401,
      body: authConfig.errorResponse || "Unauthorized.",
    };
  }

  if (!jwtString) {
    return unauthorizedResponse();
  }

  const jwt = jsonwebtoken.verify(jwtString, authConfig.publicKey);
  if (authConfig.verify) {
    const verificationResult = await authConfig.verify(jwt);
    if (!verificationResult) {
      return unauthorizedResponse();
    }
  }
}
