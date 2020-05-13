export interface IAppConfig {
  cookies: {
    maxAge: number;
  };
  sessionKeys: string;
  domain: string;
  prop: "value";
}

export interface IJwtConfig {
  publicKey: string;
  privateKey: string;
  signOptions: object;
}
