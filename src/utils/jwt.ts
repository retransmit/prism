import jwt = require("jsonwebtoken");
import { IJwtConfig } from "../types";

let config: IJwtConfig;

export function init(c: IJwtConfig) {
  if (!config) {
    config = c;
  } else {
    throw "JWT config has already been initialized.";
  }
}

export function getConfig(): IJwtConfig {
  return config;
}

export type IJwt = {
  [key: string]: string;
};

export type IVerifiedInvalidJwt = {
  valid: false;
};

export type IVerifiedValidJwt = {
  valid: true;
  value: IJwt;
};

export type IVerifiedJwt = IVerifiedInvalidJwt | IVerifiedValidJwt;

export function verify(token: string): IVerifiedJwt {
  try {
    return {
      valid: true,
      value: jwt.verify(token, config.publicKey) as any,
    };
  } catch {
    return { valid: false };
  }
}

export function decode(token: string): IJwt | undefined {
  const result = jwt.decode(token) as any;
  return result || undefined;
}
