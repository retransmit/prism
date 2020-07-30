import jsonwebtoken = require("jsonwebtoken");
import { getHeaderAsString } from "../../../../utils/http/getHeaderAsString";
import { HttpRequest, BodyObject } from "../../../../types/http";
import { HttpServiceJwtAuthentication } from "../../../../types/httpServiceAuthentication";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpServiceJwtAuthentication
): Promise<{ status: number; body: any } | undefined> {
  let jwtString: string | undefined = "";

  if (authConfig.getJwt) {
    jwtString = authConfig.getJwt(request);
  }

  if (authConfig.jwtHeaderField || request.headers?.["authorization"]) {
    const headerVal = getHeaderAsString(
      authConfig.jwtHeaderField
        ? request.headers?.[authConfig.jwtHeaderField]
        : request.headers?.["authorization"]
    );

    jwtString = headerVal
      ? headerVal.startsWith("Bearer ")
        ? headerVal.split(" ")[1]
        : headerVal
      : undefined;

    if (authConfig.jwtBodyField) {
      jwtString = (request.body as BodyObject)?.[authConfig.jwtBodyField];
    }
  }

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
