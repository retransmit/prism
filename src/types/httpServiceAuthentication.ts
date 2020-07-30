import { HttpRequest } from "./http";

export type Algorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "none";

export type HttpServiceJwtAuthentication = {
  type: "jwt";
  key: string;
  jwtHeaderField?: string;
  getJwt?: (request: HttpRequest) => string;
  jwtBodyField?: string;
  verify?: (jwt: string | object, request: HttpRequest) => Promise<boolean>;
  onError?: (error: any, request: HttpRequest) => any;
  errorStatus?: number;
  errorBody?: any;
  verifyOptions?: {
    algorithms?: Algorithm[];
    audience?: string; // | RegExp | Array<string | RegExp>;
    clockTimestamp?: number;
    clockTolerance?: number;
    // return an object with the decoded `{ payload, header, signature }
    // instead of only the usual content of the payload. */
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    /**
     * If you want to check `nonce` claim, provide a string value here.
     * It is used on Open ID for the ID Tokens. ([Open ID implementation notes](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes))
     */
    nonce?: string;
    subject?: string;
  };
};

export type HttpServiceAuthentication = HttpServiceJwtAuthentication;
