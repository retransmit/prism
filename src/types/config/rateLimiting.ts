export type RateLimitingConfig = {
  type: "ip";
  maxRequests: number;
  duration: number;
  errorStatus?: number;
  errorBody?: any;
};