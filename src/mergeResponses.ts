import * as configModule from "./config";
import { CollatedResult, HttpResponse, RouteConfig } from "./types";

/*
  Merge received results into a final response
*/
export default function mergeResponses(
  requestId: string,
  collatedResults: CollatedResult
): HttpResponse | undefined {
  const config = configModule.get();
  if (!collatedResults.aborted) {
    let finalResponse: HttpResponse = { status: 200, content: undefined };

    for (const result of collatedResults.results) {
      if (result.ignore === false) {
        const routeConfig = config.routes[result.path][
          result.method
        ] as RouteConfig;
        if (routeConfig.services[result.service].merge !== false) {
          if (result.response) {
            if (result.response.content) {
              /*
              If the response has already been redirected, you can't write on to it.
            */
              if (finalResponse.redirect) {
                return {
                  status: 500,
                  content: `${result.service} is redirecting the response to ${result.response.redirect} but content has already been added to the response.`,
                };
              } else {
                /*
                If current response is not an object and new result is an object, we throw an error. We can't merge an object on to a string.
              */
                if (typeof result.response.content === "object") {
                  if (typeof finalResponse.content === "undefined") {
                    finalResponse.content =
                      result.response.content;
                    finalResponse.contentType = "application/json";
                  } else {
                    if (typeof finalResponse.content !== "object") {
                      return {
                        status: 500,
                        content: `Cannot merge multiple types of content. ${
                          result.service
                        } is returned a json response while the current response is of type ${typeof finalResponse.content}.`,
                      };
                    } else {
                      const mergeField =
                        routeConfig.services[result.service]
                          .mergeField;

                      finalResponse.content = mergeField
                        ? {
                            ...finalResponse.content,
                            [mergeField]: result.response.content,
                          }
                        : {
                            ...finalResponse.content,
                            ...result.response.content,
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
                      content: `${result.service} returned a response which will overwrite current response.`,
                    };
                  } else {
                    const mergeField =
                      routeConfig.services[result.service]
                        .mergeField;

                    finalResponse.content = mergeField
                      ? { [mergeField]: result.response.content }
                      : result.response.content;
                  }
                }
              }

              /*
              Content type cannot be changed once set.
            */
              if (result.response.contentType) {
                if (
                  finalResponse.contentType &&
                  result.response.contentType !==
                    finalResponse.contentType
                ) {
                  return {
                    status: 500,
                    content: `${result.service} returned content type ${result.response.contentType} while the current response has content type ${finalResponse.contentType}.`,
                  };
                } else {
                  finalResponse.contentType =
                    result.response.contentType;
                }
              }
            }

            /*
            If the response content has already been modified previously, then you cannot redirect. If there's already a pending redirect, you cannot redirect again.
          */
            if (result.response.redirect) {
              if (finalResponse.content) {
                return {
                  status: 500,
                  content: `${result.service} is redirecting to ${result.response.redirect} but the current response already has some content.`,
                };
              } else if (finalResponse.redirect) {
                return {
                  status: 500,
                  content: `${result.service} is redirecting to ${result.response.redirect} but the response has already been redirected to ${finalResponse.redirect}.`,
                };
              } else {
                finalResponse.redirect = result.response.redirect;
              }
            }

            /*
            Cannot have multiple status codes.
            If results have differing 2xx codes, send 200.
            If results have 2xx and 4xx (or 3xx or 5xx), that's an error
          */
            if (result.response.status) {
              if (!finalResponse.status) {
                finalResponse.status = result.response.status;
              } else {
                if (
                  finalResponse.status !== result.response.status
                ) {
                  if (
                    finalResponse.status >= 200 &&
                    finalResponse.status <= 299 &&
                    result.response.status >= 200 &&
                    result.response.status <= 299
                  ) {
                    finalResponse.status = 200;
                  } else {
                    return {
                      status: 500,
                      content: `${result.service} is returning status code ${result.response.status} but the response already has its status set to ${finalResponse.status}.`,
                    };
                  }
                }
              }
            }

            /*
            We concat all cookies.
          */
            if (result.response.cookies) {
              finalResponse.cookies = (finalResponse.cookies || []).concat(
                result.response.cookies
              );
            }
          }
        }
      }
    }
    return finalResponse;
  } else {
    return collatedResults.errorResult.ignore === false
      ? collatedResults.errorResult.response
      : {
          status: 500,
          content: "Internal server error",
        };
  }
}
