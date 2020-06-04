import { Response } from "got/dist/source/core";
import { WebSocketResponse } from "../../../../types/webSocketRequests";

export function makeWebSocketResponse(
  serverResponse: Response<string>,
  requestId?: string
): WebSocketResponse {
  const result = JSON.parse(serverResponse.body);
  return requestId
    ? {
        ...result,
        id: requestId,
      }
    : result;
}
