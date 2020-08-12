import {
  NativeHttpServiceEndPointConfig,
  InvokeHttpServiceResult,
} from "../../../../types/config/httpProxy";
import { HttpRequest, HttpMethods, FetchedHttpResponse } from "../../../../types/http";
import responseIsError from "../../../../utils/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import { makeGotOptions } from "../../../../utils/http/gotUtil";
import got from "got/dist/source";

export default async function makeGotRequest(
  requestId: string,
  request: HttpRequest,
  route: string,
  method: HttpMethods,
  service: string,
  stage: number | undefined,
  startTime: number,
  fetchedResponses: FetchedHttpResponse[],
  serviceConfig: NativeHttpServiceEndPointConfig,
  success: (result: InvokeHttpServiceResult) => void
) {
  const options = makeGotOptions(
    request,
    serviceConfig.contentEncoding,
    serviceConfig.contentType,
    serviceConfig.timeout
  );

  got(request.path, options)
    .then(async (serverResponse) => {
      const response = makeHttpResponse(serverResponse);

      if (responseIsError(response)) {
        if (serviceConfig.onError) {
          serviceConfig.onError(response, request);
        }
      }

      // Use the original request here - not modifiedRequest
      const modifiedResponse =
        (serviceConfig.onResponse &&
          (await serviceConfig.onResponse(
            response,
            request,
            fetchedResponses
          ))) ||
        response;

      const fetchedResponse = {
        type: "http" as "http",
        id: requestId,
        route,
        method,
        path: request.path,
        service,
        time: Date.now() - startTime,
        response: modifiedResponse,
        stage,
      };

      success({ skip: false, response: fetchedResponse });
    })
    .catch(async (error) => {
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

      // Use the original request here - not modifiedRequest
      const modifiedResponse =
        (serviceConfig.onResponse &&
          (await serviceConfig.onResponse(
            errorResponse,
            request,
            fetchedResponses
          ))) ||
        errorResponse;

      const fetchedResponse = {
        type: "http" as "http",
        id: requestId,
        route,
        method,
        path: request.path,
        service,
        time: Date.now() - startTime,
        response: modifiedResponse,
        stage,
      };

      success({ skip: false, response: fetchedResponse });
    });
}
