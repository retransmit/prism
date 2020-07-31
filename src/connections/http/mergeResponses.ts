import { HttpProxyAppConfig } from "../../types/config";
import responseIsError from "../../utils/http/responseIsError";
import {
  FetchedHttpResponse,
  HttpRouteConfig,
  HttpServiceEndPointConfig,
} from "../../types/config/httpProxy";
import getHeader from "../../utils/http/getHeader";
import { HttpResponse, HttpRequestBodyObject } from "../../types/http";

export default function mergeResponses(
  responses: FetchedHttpResponse[],
  config: HttpProxyAppConfig
): HttpResponse {
  let finalResponse: HttpResponse = {};

  for (const fetchedResponse of responses) {
    if (typeof fetchedResponse.response !== "undefined") {
      const routeConfig = config.http.routes[fetchedResponse.route][
        fetchedResponse.method
      ] as HttpRouteConfig;

      const serviceConfig = routeConfig.services[fetchedResponse.service];

      // If merge is false, we ignore.
      if (
        serviceConfig.merge === false ||
        fetchedResponse.response === undefined
      ) {
        continue;
      }

      // If it's an error we return immediately.
      if (responseIsError(fetchedResponse.response)) {
        return {
          status: fetchedResponse.response?.status,
          body: fetchedResponse.response?.body,
        };
      }

      const mergeResultFunctions = [
        mergeRedirectIntoResponse,
        mergeBodyIntoResponse,
        mergeStatusIntoResponse,
        mergeCookiesIntoResponse,
        mergeHeadersIntoResponse,
      ];

      const wrappedFinalResponse = { response: finalResponse };
      for (const fn of mergeResultFunctions) {
        const result = fn(fetchedResponse, wrappedFinalResponse, serviceConfig);
        if (result) {
          return result;
        }
      }

      finalResponse = wrappedFinalResponse.response;
    }
  }
  return finalResponse;
}

function mergeRedirectIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse },
  serviceConfig: HttpServiceEndPointConfig
): HttpResponse | void {
  // If the response content has already been modified previously,
  // then you cannot redirect. If there's already a pending redirect,
  // you cannot redirect again.
  if (
    fetchedResponse.response?.redirect &&
    wrappedFinalResponse.response.body
  ) {
    return {
      status: 500,
      body: `${fetchedResponse.service} is redirecting to ${fetchedResponse.response.redirect} but the current response already has some content.`,
    };
  }

  // If the fetched response is redirecting, but the
  // final response has already been redirected.
  if (
    fetchedResponse.response?.redirect &&
    wrappedFinalResponse.response.redirect
  ) {
    return {
      status: 500,
      body: `${fetchedResponse.service} is redirecting to ${fetchedResponse.response.redirect} but the response has already been redirected to ${wrappedFinalResponse.response.redirect}.`,
    };
  }

  if (fetchedResponse.response.redirect) {
    wrappedFinalResponse.response.redirect = fetchedResponse.response.redirect;
  }
}

function mergeBodyIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse },
  serviceConfig: HttpServiceEndPointConfig
): HttpResponse | void {
  // If the response has already been redirected,
  // you can't write on to it.
  if (fetchedResponse.response.body && wrappedFinalResponse.response.redirect) {
    return {
      status: 500,
      body: `${fetchedResponse.service} is redirecting the response to ${fetchedResponse.response.redirect} but content has already been added to the response.`,
    };
  }

  // The fetched response is an object.
  if (typeof fetchedResponse.response.body === "object") {
    return mergeObjectIntoResponse(
      fetchedResponse,
      wrappedFinalResponse,
      serviceConfig
    );
  }
  // The fetched response is a string or empty.
  else {
    return mergeNonObjectIntoResponse(
      fetchedResponse,
      wrappedFinalResponse,
      serviceConfig
    );
  }
}

function mergeObjectIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse },
  serviceConfig: HttpServiceEndPointConfig
): HttpResponse | void {
  // If the fetched response is an object and final response is not object.
  if (
    typeof fetchedResponse.response.body === "object" &&
    wrappedFinalResponse.response.body !== undefined &&
    typeof wrappedFinalResponse.response.body !== "object"
  ) {
    return {
      status: 500,
      body: `Cannot merge multiple types of content. ${
        fetchedResponse.service
      } is returned an object response while the current response is of type ${typeof wrappedFinalResponse
        .response.body}.`,
    };
  }

  // If the final response is undefined,
  // we should create an object.
  if (wrappedFinalResponse.response.body === undefined) {
    wrappedFinalResponse.response.body = serviceConfig.mergeField
      ? {
          [serviceConfig.mergeField]: fetchedResponse.response.body,
        }
      : fetchedResponse.response.body;

    wrappedFinalResponse.response.contentType = "application/json";
  }

  // If the final response is an object, merge.
  else if (typeof wrappedFinalResponse.response.body === "object") {
    const mergeField = serviceConfig.mergeField;

    wrappedFinalResponse.response.body = mergeField
      ? {
          ...wrappedFinalResponse.response.body,
          [mergeField]: fetchedResponse.response.body,
        }
      : {
          ...wrappedFinalResponse.response.body,
          ...(fetchedResponse.response.body as HttpRequestBodyObject),
        };
  }
  fetchedResponse.response.body;
}

function mergeNonObjectIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse },
  serviceConfig: HttpServiceEndPointConfig
): HttpResponse | void {
  // If the final response is an object,
  // and the fetched response is not
  // and there is no merge field.
  if (
    fetchedResponse.response.body !== undefined &&
    typeof fetchedResponse.response.body !== "object" &&
    typeof wrappedFinalResponse.response.body === "object" &&
    !serviceConfig.mergeField
  ) {
    return {
      status: 500,
      body: `Cannot merge multiple types of content. ${
        fetchedResponse.service
      } is returned a ${typeof fetchedResponse.response
        .body} response while the current response is an object.`,
    };
  }

  // final response has not been set.
  if (wrappedFinalResponse.response.body === undefined) {
    const contentTypeFromResponse = getHeader(
      fetchedResponse.response.headers,
      "content-type"
    );

    wrappedFinalResponse.response = serviceConfig.mergeField
      ? {
          body: {
            [serviceConfig.mergeField]: fetchedResponse.response.body,
          },
          contentType: "application/json",
        }
      : {
          body: fetchedResponse.response.body,
          contentType: contentTypeFromResponse || "text/plain",
        };
  }
  // If final response is already an object
  else if (typeof wrappedFinalResponse.response.body === "object") {
    // If there's a merge field, add the response on to it.
    if (serviceConfig.mergeField) {
      wrappedFinalResponse.response.body = {
        ...wrappedFinalResponse.response.body,
        [serviceConfig.mergeField]: fetchedResponse.response.body,
      };
    }
  }
}

function mergeStatusIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse }
): HttpResponse | void {
  if (fetchedResponse.response.status) {
    // Cannot have multiple status codes.
    // If results have differing 2xx codes, send 200.
    // If results have 2xx and 4xx (or 3xx or 5xx), that's an error
    if (
      wrappedFinalResponse.response.status &&
      fetchedResponse.response?.status &&
      ((isRegularStatusCode(fetchedResponse.response.status) &&
        !isRegularStatusCode(wrappedFinalResponse.response.status)) ||
        (isRegularStatusCode(wrappedFinalResponse.response.status) &&
          !isRegularStatusCode(fetchedResponse.response.status)) ||
        (!isRegularStatusCode(fetchedResponse.response.status) &&
          !isRegularStatusCode(wrappedFinalResponse.response.status)))
    ) {
      return {
        status: 500,
        body: `${fetchedResponse.service} is returning status code ${fetchedResponse.response.status} but the response already has its status set to ${wrappedFinalResponse.response.status}.`,
      };
    }

    if (!wrappedFinalResponse.response.status) {
      wrappedFinalResponse.response.status = fetchedResponse.response.status;
    } else {
      if (
        wrappedFinalResponse.response.status !== fetchedResponse.response.status
      ) {
        if (
          isRegularStatusCode(fetchedResponse.response.status) &&
          isRegularStatusCode(wrappedFinalResponse.response.status)
        ) {
          wrappedFinalResponse.response.status = 200;
        }
      }
    }
  }
}

function mergeHeadersIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse }
): HttpResponse | void {
  // Copy all headers except content-type
  const headers = fetchedResponse.response.headers;
  if (headers) {
    wrappedFinalResponse.response.headers = Object.keys(headers).reduce(
      (acc, field) =>
        !["content-length"].includes(field.toLowerCase())
          ? ((acc[field] = headers[field]), acc)
          : acc,
      wrappedFinalResponse.response.headers || {}
    );
  }
}

// We concat all cookies.
// Note: This could conflict with the Set-Cookie headers.
// But we can't do much about it.
function mergeCookiesIntoResponse(
  fetchedResponse: FetchedHttpResponse,
  wrappedFinalResponse: { response: HttpResponse }
): HttpResponse | void {
  if (fetchedResponse.response.cookies) {
    wrappedFinalResponse.response.cookies = (
      wrappedFinalResponse.response.cookies || []
    ).concat(fetchedResponse.response.cookies);
  }
}

function isRegularStatusCode(status: number) {
  return status >= 200 && status <= 299;
}
