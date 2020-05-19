import * as configModule from "./config";
import {
  HttpResponse,
  RouteConfig,
  FetchedResponse,
} from "./types";

/*
  Merge received results into a final response
*/
export default function mergeResponses(
  requestId: string,
  responses: FetchedResponse[]
): HttpResponse | undefined {
  const config = configModule.get();
  let finalResponse: HttpResponse = { status: 200, content: undefined };

  for (const response of responses) {
    if (typeof response.response !== "undefined") {
      const routeConfig = config.routes[response.path][
        response.method
      ] as RouteConfig;
      const serviceConfig = routeConfig.services[response.service];
      if (serviceConfig.merge !== false) {
        if (response.response) {
          if (response.response.content) {
            /*
              If the response has already been redirected, you can't write on to it.
            */
            if (finalResponse.redirect) {
              return {
                status: 500,
                content: `${response.service} is redirecting the response to ${response.response.redirect} but content has already been added to the response.`,
              };
            } else {
              /*
                If current response is not an object and new result is an object, we throw an error. We can't merge an object on to a string.
              */
              if (typeof response.response.content === "object") {
                if (typeof finalResponse.content === "undefined") {
                  finalResponse.content = response.response.content;
                  finalResponse.contentType = "application/json";
                } else {
                  if (typeof finalResponse.content !== "object") {
                    return {
                      status: 500,
                      content: `Cannot merge multiple types of content. ${
                        response.service
                      } is returned a json response while the current response is of type ${typeof finalResponse.content}.`,
                    };
                  } else {
                    const mergeField = serviceConfig.mergeField;

                    finalResponse.content = mergeField
                      ? {
                          ...finalResponse.content,
                          [mergeField]: response.response.content,
                        }
                      : {
                          ...finalResponse.content,
                          ...response.response.content,
                        };
                    finalResponse.contentType = "application/json";
                  }
                }
              } else {
                /*
                  Again, if current response is already set, we can't overwrite.
                */
                if (typeof finalResponse.content !== "undefined") {
                  return {
                    status: 500,
                    content: `${response.service} returned a response which will overwrite current response.`,
                  };
                } else {
                  const mergeField = serviceConfig.mergeField;

                  finalResponse.content = mergeField
                    ? { [mergeField]: response.response.content }
                    : response.response.content;
                }
              }
            }

            /*
              Content type cannot be changed once set.
            */
            if (response.response.contentType) {
              if (
                finalResponse.contentType &&
                response.response.contentType !== finalResponse.contentType
              ) {
                return {
                  status: 500,
                  content: `${response.service} returned content type ${response.response.contentType} while the current response has content type ${finalResponse.contentType}.`,
                };
              } else {
                finalResponse.contentType = response.response.contentType;
              }
            }
          }

          /*
            If the response content has already been modified previously, then you cannot redirect. If there's already a pending redirect, you cannot redirect again.
          */
          if (response.response.redirect) {
            if (finalResponse.content) {
              return {
                status: 500,
                content: `${response.service} is redirecting to ${response.response.redirect} but the current response already has some content.`,
              };
            } else if (finalResponse.redirect) {
              return {
                status: 500,
                content: `${response.service} is redirecting to ${response.response.redirect} but the response has already been redirected to ${finalResponse.redirect}.`,
              };
            } else {
              finalResponse.redirect = response.response.redirect;
            }
          }

          /*
            Cannot have multiple status codes.
            If results have differing 2xx codes, send 200.
            If results have 2xx and 4xx (or 3xx or 5xx), that's an error
          */
          if (response.response.status) {
            if (!finalResponse.status) {
              finalResponse.status = response.response.status;
            } else {
              if (finalResponse.status !== response.response.status) {
                if (
                  finalResponse.status >= 200 &&
                  finalResponse.status <= 299 &&
                  response.response.status >= 200 &&
                  response.response.status <= 299
                ) {
                  finalResponse.status = 200;
                } else {
                  return {
                    status: 500,
                    content: `${response.service} is returning status code ${response.response.status} but the response already has its status set to ${finalResponse.status}.`,
                  };
                }
              }
            }
          }

          /*
            We concat all cookies.
          */
          if (response.response.cookies) {
            finalResponse.cookies = (finalResponse.cookies || []).concat(
              response.response.cookies
            );
          }
        }
      }
    }
  }
  return finalResponse;
}
