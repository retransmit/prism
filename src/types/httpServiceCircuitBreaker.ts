export type HttpServiceCircuitBreakerConfig = {
  maxErrors: number;
  duration: number;
  errorStatus?: number;
  errorBody?: any;
};