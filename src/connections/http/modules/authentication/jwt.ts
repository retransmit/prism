import jsonwebtoken = require("jsonwebtoken");
import { getHeaderAsString } from "../../../../utils/http/getHeaderAsString";
import { HttpRequest, HttpRequestBodyObject } from "../../../../types/http";
import {
  HttpProxyJwtAuthenticationConfig,
  HttpProxyAuthenticationConfig,
} from "../../../../types/config/httpProxy/authentication";
import { AppConfig } from "../../../../types/config";
import { HttpRouteConfig } from "../../../../types/config/httpProxy";

export default async function authenticate(
  request: HttpRequest,
  authConfig: HttpProxyAuthenticationConfig,
  routeConfig: HttpRouteConfig,
  config: AppConfig
): Promise<{ status: number; body: any } | undefined> {
  const jwtAuthConfig = authConfig as HttpProxyJwtAuthenticationConfig;
  let jwtString: string | undefined = "";

  if (jwtAuthConfig.getJwt) {
    jwtString = jwtAuthConfig.getJwt(request);
  }

  if (jwtAuthConfig.jwtHeaderField || request.headers?.["authorization"]) {
    const headerVal = getHeaderAsString(
      jwtAuthConfig.jwtHeaderField
        ? request.headers?.[jwtAuthConfig.jwtHeaderField]
        : request.headers?.["authorization"]
    );

    jwtString = headerVal
      ? headerVal.startsWith("Bearer ")
        ? headerVal.split(" ")[1]
        : headerVal
      : undefined;

    if (jwtAuthConfig.jwtBodyField) {
      jwtString = (request.body as HttpRequestBodyObject)?.[
        jwtAuthConfig.jwtBodyField
      ];
    }
  }

  if (!jwtString) {
    throw new Error("Missing JWT.");
  }

  let jwt: string | object;

  try {
    jwt = jsonwebtoken.verify(
      jwtString,
      jwtAuthConfig.key,
      jwtAuthConfig.verifyOptions
    );

    if (jwtAuthConfig.verify) {
      const verificationResult = await jwtAuthConfig.verify(jwt, request);
      if (!verificationResult) {
        throw new Error("Custom verification returned false.");
      }
    }
  } catch (ex) {
    return unauthorizedResponse(jwtAuthConfig, ex, request);
  }
}

function unauthorizedResponse(
  authConfig: HttpProxyJwtAuthenticationConfig,
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
