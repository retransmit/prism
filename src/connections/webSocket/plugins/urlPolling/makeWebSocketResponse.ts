import { Response } from "got/dist/source/core";
import { WebSocketResponse } from "../../../../types/webSocketProxy";

export function makeWebSocketResponse(
  serverResponse: Response<any>,
  requestId?: string
): WebSocketResponse {
  const result = JSON.parse(serverResponse.body);
  return requestId
    ? {
        ...result,
        type: result.type || "message",
        id: requestId,
      }
    : result;
}
