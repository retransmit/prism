import { NativeHttpServiceEndPointConfig } from "../../../../types/http";
import { HttpRequest } from "../../../../types";
import responseIsError from "../../../../utils/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got/dist/source";

export default async function fireAndForgetGotRequest(
  request: HttpRequest,
  serviceConfig: NativeHttpServiceEndPointConfig
) {
  const options = makeGotOptions(
    request,
    serviceConfig.contentEncoding,
    serviceConfig.contentType,
    serviceConfig.timeout
  );

  got(request.path, options).catch(async (error) => {
    const errorResponse = error.response
      ? makeHttpResponse(error.response)
      : {
          status: 400,
          body: error.message,
        };

    if (responseIsError(errorResponse)) {
      if (serviceConfig.onError) {
        serviceConfig.onError(errorResponse, request);
      }
    }
  });
}
