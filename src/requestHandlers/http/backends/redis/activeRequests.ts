import { HttpRequest } from "../../../../types";
import { InvokeServiceResult } from "../../../../types/httpRequests";

export type ActiveHttpRequest = {
  // keepAlive: boolean;
  responseChannel: string;
  id: string;
  timeoutAt: number;
  service: string;
  startTime: number;
  request: HttpRequest;
  onResponse: (result: InvokeServiceResult) => void;
};

const map = new Map<string, ActiveHttpRequest>();

export default map;
