import { Response } from "got/dist/source/core";
import { WebSocketServiceResponse } from "../../../../types/webSocket";

export function makeWebSocketResponse(
  serverResponse: Response<any>
): WebSocketServiceResponse {
  return JSON.parse(serverResponse.body);
  return requestId
    ? {
        ...result,
        type: result.type || "message",
        id: requestId,
      }
    : result;
}
