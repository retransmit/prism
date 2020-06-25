import * as configModule from "../../config";
import { HttpResponse, HttpProxyConfig } from "../../types";
import responseIsError from "../../lib/http/responseIsError";
import {
  FetchedHttpRequestHandlerResponse,
  HttpRouteConfig,
} from "../../types/http";
/*
  Merge received results into a final response
*/
export default function mergeResponses(
  requestId: string,
  responses: FetchedHttpRequestHandlerResponse[],
  httpConfig: HttpProxyConfig
): HttpResponse {
  const config = configModule.get();
  let finalResponse: HttpResponse = {};

  for (const fetchedResponse of responses) {
    if (typeof fetchedResponse.response !== "undefined") {
      const routeConfig = httpConfig.routes[fetchedResponse.path][
        fetchedResponse.method
      ] as HttpRouteConfig;
      const serviceConfig = routeConfig.services[fetchedResponse.service];
      if (serviceConfig.merge !== false) {
        if (fetchedResponse.response) {
          if (responseIsError(fetchedResponse.response)) {
            return {
              status: fetchedResponse.response?.status,
              body: fetchedResponse.response?.body,
            };
          }
          if (fetchedResponse.response.body) {
            /*
              If the response has already been redirected, you can't write on to it.
            */
            if (finalResponse.redirect) {
              return {
                status: 500,
                body: `${fetchedResponse.service} is redirecting the response to ${fetchedResponse.response.redirect} but content has already been added to the response.`,
              };
            } else {
              /*
                If current response is not an object and new result is an object, we throw an error. We can't merge an object on to a string.
              */
              if (typeof fetchedResponse.response.body === "object") {
                if (typeof finalResponse.body === "undefined") {
                  finalResponse.body = fetchedResponse.response.body;
                  finalResponse.contentType = "application/json";
                } else {
                  if (typeof finalResponse.body !== "object") {
                    return {
                      status: 500,
                      body: `Cannot merge multiple types of content. ${
                        fetchedResponse.service
                      } is returned a json response while the current response is of type ${typeof finalResponse.body}.`,
                    };
                  } else {
                    const mergeField = serviceConfig.mergeField;

                    finalResponse.body = mergeField
                      ? {
                          ...finalResponse.body,
                          [mergeField]: fetchedResponse.response.body,
                        }
                      : {
                          ...finalResponse.body,
                          ...fetchedResponse.response.body,
                        };
                    finalResponse.contentType = "application/json";
                  }
                }
              } else {
                /*
                  Again, if current response is already set, we can't overwrite.
                */
                if (typeof finalResponse.body !== "undefined") {
                  return {
                    status: 500,
                    body: `${fetchedResponse.service} returned a response which will overwrite current response.`,
                  };
                } else {
                  const mergeField = serviceConfig.mergeField;

                  finalResponse.body = mergeField
                    ? { [mergeField]: fetchedResponse.response.body }
                    : fetchedResponse.response.body;
                }
              }
            }

            /*
              Content type cannot be changed once set.
            */
            if (fetchedResponse.response.contentType) {
              if (
                finalResponse.contentType &&
                fetchedResponse.response.contentType !==
                  finalResponse.contentType
              ) {
                return {
                  status: 500,
                  body: `${fetchedResponse.service} returned content type ${fetchedResponse.response.contentType} while the current response has content type ${finalResponse.contentType}.`,
                };
              } else {
                finalResponse.contentType =
                  fetchedResponse.response.contentType;
              }
            }
          }

          /*
            If the response content has already been modified previously, then you cannot redirect. If there's already a pending redirect, you cannot redirect again.
          */
          if (fetchedResponse.response.redirect) {
            if (finalResponse.body) {
              return {
                status: 500,
                body: `${fetchedResponse.service} is redirecting to ${fetchedResponse.response.redirect} but the current response already has some content.`,
              };
            } else if (finalResponse.redirect) {
              return {
                status: 500,
                body: `${fetchedResponse.service} is redirecting to ${fetchedResponse.response.redirect} but the response has already been redirected to ${finalResponse.redirect}.`,
              };
            } else {
              finalResponse.redirect = fetchedResponse.response.redirect;
            }
          }

          /*
            Cannot have multiple status codes.
            If results have differing 2xx codes, send 200.
            If results have 2xx and 4xx (or 3xx or 5xx), that's an error
          */
          if (fetchedResponse.response.status) {
            if (!finalResponse.status) {
              finalResponse.status = fetchedResponse.response.status;
            } else {
              if (finalResponse.status !== fetchedResponse.response.status) {
                if (
                  finalResponse.status >= 200 &&
                  finalResponse.status <= 299 &&
                  fetchedResponse.response.status >= 200 &&
                  fetchedResponse.response.status <= 299
                ) {
                  finalResponse.status = 200;
                } else {
                  return {
                    status: 500,
                    body: `${fetchedResponse.service} is returning status code ${fetchedResponse.response.status} but the response already has its status set to ${finalResponse.status}.`,
                  };
                }
              }
            }
          }

          /*
            We concat all cookies.
          */
          if (fetchedResponse.response.cookies) {
            finalResponse.cookies = (finalResponse.cookies || []).concat(
              fetchedResponse.response.cookies
            );
          }

          /*
            Headers!
          */
          if (fetchedResponse.response.headers) {
            finalResponse.headers = {
              ...finalResponse.headers,
              ...fetchedResponse.response.headers,
            };
          }
        }
      }
    }
  }
  return finalResponse;
}
