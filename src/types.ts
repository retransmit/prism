export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface IAppConfig {
  jwt?: {
    fieldName: string;
    required: boolean;
    requiredFields?: {
      [key: string]: string;
    };
  };
  logging?: {
    jwt: boolean;
  };
  routes: {
    [key: string]: {
      [key in HttpMethods]: {
        services: {
          [key: string]: {
            validateJwt: boolean;
            passJwt: boolean;
            awaitResponse: boolean;
            mergeResponse: boolean;
            mergeInto?: "object" | "field";
            abortOnError: boolean;
            logErrors: boolean;
            timeoutMS: number;
          };
        };
        numChannels?: number;
      };
    };
  };
}

export interface IJwtConfig {
  publicKey: string;
}
