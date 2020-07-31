export type HttpProxyCacheConfig = {
  varyBy?: {
    headers?: string[];
    query?: string[];
    body?: string[];
  };
  expiry: number;
  maxSize?: number;
};
