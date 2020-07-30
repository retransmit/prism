export type CorsConfig = {
  origin?: string;
  allowMethods?: string;
  maxAge?: number;
  allowHeaders?: string | string[];
  credentials?: boolean;
};
