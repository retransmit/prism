export type HttpProxyCircuitBreakerConfig = {
  maxErrors: number;
  duration: number;
  errorStatus?: number;
  errorBody?: any;
};