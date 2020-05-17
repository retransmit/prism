import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import {
  HttpMethods,
  ServiceResult,
  HttpResponse,
  HandlerConfig,
  IAppConfig,
  CollatedResult,
  FetchedResult,
  RequestData,
} from "./types";
import randomId from "./random";
import redis = require("redis");

let subscriber: redis.RedisClient;
let publisher: redis.RedisClient;

const activeRequests = new Map<string, RequestData>();

export async function init() {
  const config = configModule.get();

  subscriber = redis.createClient(config.redis?.options);
  publisher = redis.createClient(config.redis?.options);

  // Setup subscriptions
  if (config.responseChannel) {
    subscriber.subscribe(config.responseChannel);
  }

  for (const route in config.routes) {
    for (const method in config.routes[route]) {
      const handlerConfig = config.routes[route][
        method as HttpMethods
      ] as HandlerConfig;
      if (handlerConfig.responseChannel) {
        subscriber.subscribe(handlerConfig.responseChannel);
      }
    }
  }

  subscriber.on("message", processMessages);

  // Some services may never respond. Fail them.
  setInterval(cleanupMessages, config.cleanupIntervalMS || 10000);
}

/*
  Messages in various responseChannels (sent by the participating services) land here.
*/
async function processMessages(channel: string, messageString: string) {
  const config = configModule.get();

  const serviceResult = JSON.parse(messageString) as ServiceResult;

  const activeRequest = activeRequests.get(
    `${serviceResult.id}+${serviceResult.service}`
  );

  if (activeRequest && activeRequest.channel === channel) {
    const handlerConfig = config.routes[activeRequest.path][
      activeRequest.method
    ] as HandlerConfig;
    const resultHandler =
      (config.handlers && config.handlers.result) ||
      (handlerConfig.handlers && handlerConfig.handlers.result);

    const processingTime = Date.now() - activeRequest.startTime;

    if (serviceResult.success) {
      const fetchedResult = {
        time: processingTime,
        ignore: false,
        path: activeRequest.path,
        method: activeRequest.method,
        service: activeRequest.service,
        serviceResult: serviceResult,
      };
      activeRequest.onSuccess(
        resultHandler ? await resultHandler(fetchedResult) : fetchedResult
      );
    } else {
      const handlerConfig = config.routes[activeRequest.path][
        activeRequest.method
      ] as HandlerConfig;
      if (
        handlerConfig.services[activeRequest.service].abortOnError === false
      ) {
        const fetchedResult = {
          time: processingTime,
          ignore: true as true,
          path: activeRequest.path,
          method: activeRequest.method,
          service: activeRequest.service,
        };
        activeRequest.onSuccess(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      } else {
        const fetchedResult = {
          time: processingTime,
          ignore: false,
          path: activeRequest.path,
          method: activeRequest.method,
          service: activeRequest.service,
          serviceResult: serviceResult,
        };
        activeRequest.onError(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      }
    }
  }
}

let isCleaningUp = false;

/*
  Scavenging for timed out messages
*/
async function cleanupMessages() {
  if (!isCleaningUp) {
    isCleaningUp = true;
    const config = configModule.get();
    const entries = activeRequests.entries();

    const timedOut: [string, RequestData][] = [];
    for (const [id, requestData] of entries) {
      if (Date.now() > requestData.timeoutTicks) {
        timedOut.push([requestData.id, requestData]);
      }
    }

    for (const [activeRequestId, requestData] of timedOut) {
      const handlerConfig = config.routes[requestData.path][
        requestData.method
      ] as HandlerConfig;
      const resultHandler =
        (config.handlers && config.handlers.result) ||
        (handlerConfig.handlers && handlerConfig.handlers.result);

      if (handlerConfig.services[requestData.service].abortOnError === false) {
        const fetchedResult = {
          time: Date.now() - requestData.startTime,
          ignore: true as true,
          path: requestData.path,
          method: requestData.method,
          service: requestData.service,
        };
        requestData.onSuccess(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      } else {
        const fetchedResult = {
          time: Date.now() - requestData.startTime,
          ignore: false,
          service: requestData.service,
          path: requestData.path,
          method: requestData.method,
          serviceResult: {
            id: requestData.id,
            success: false,
            service: requestData.service,
            response: {
              content: `${requestData.service} timed out.`,
              status: 408,
            },
          },
        };
        requestData.onError(
          resultHandler ? await resultHandler(fetchedResult) : fetchedResult
        );
      }
      activeRequests.delete(activeRequestId);
    }
    isCleaningUp = false;
  }
}

/*
  Make an HTTP request handler
*/
export function createHandler(method: HttpMethods) {
  const config = configModule.get();

  return async function handler(ctx: IRouterContext) {
    // If there are custom handlers, try that first.
    if (config.handlers && config.handlers.request) {
      const result = config.handlers.request(ctx);
      if ((await result).handled) {
        return;
      }
    }

    const requestId = randomId(32);
    const handlerConfig = config.routes[ctx.path][method];

    if (handlerConfig) {
      const channelName = (handlerConfig.requestChannel ||
        config.requestChannel) as string;

      const payload = {
        id: requestId,
        type: "request",
        data: {
          path: ctx.path,
          params: ctx.params,
          query: ctx.query,
          body: ctx.body,
          headers: ctx.headers,
        },
      };

      const channelId = !handlerConfig.numRequestChannels
        ? channelName
        : `${channelName}${Math.floor(
            Math.random() * handlerConfig.numRequestChannels
          )}`;

      // Publish the request on to the redis channel
      publisher.publish(channelId, JSON.stringify(payload));

      const interimCollatedResults: CollatedResult = await waitForServiceResults(
        requestId,
        ctx.path,
        method,
        handlerConfig,
        config
      );

      const collatedResults =
        handlerConfig.handlers && handlerConfig.handlers.merge
          ? await handlerConfig.handlers.merge(interimCollatedResults)
          : interimCollatedResults;

      let response = mergeIntoResponse(requestId, collatedResults);

      // Add a rollback to the channel on error
      if (collatedResults.aborted) {
        const errorPayload = {
          id: requestId,
          type: "rollback",
          data: payload.data,
        };
        publisher.publish(channelId, JSON.stringify(errorPayload));
      }

      // See if there are any custom handlers for final response
      if (config.handlers && config.handlers.response) {
        const result = await config.handlers.response(ctx, response);
        if (result.handled) {
          return;
        }
      }

      // Send response back to the client.
      if (response) {
        if (
          response.status &&
          response.status >= 500 &&
          response.status <= 599 &&
          (handlerConfig.genericErrors || config.genericErrors)
        ) {
          ctx.status = 500;
          ctx.body = `Internal Server Error.`;
        } else {
          // Redirect and return
          if (response.redirect) {
            ctx.redirect(response.redirect);
            return;
          }

          // HTTP status
          if (response.status) {
            ctx.status = response.status;
          }

          // Content type
          if (response.contentType) {
            ctx.type = response.contentType;
          }

          // Response body
          ctx.body = response.content;

          // Cookies!
          if (response.cookies) {
            for (const cookie of response.cookies) {
              ctx.cookies.set(cookie.name, cookie.value, {
                domain: cookie.domain,
                path: cookie.path,
                maxAge: cookie.maxAge,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                overwrite: cookie.overwrite,
              });
            }
          }
        }
      }
    } else {
      // 404 not found
      ctx.status = 404;
      ctx.body = "Not found.";
    }
  };
}

/*
  Wait for services to send results
*/
async function waitForServiceResults(
  requestId: string,
  path: string,
  method: HttpMethods,
  handlerConfig: HandlerConfig,
  config: IAppConfig
): Promise<CollatedResult> {
  const toWait = Object.keys(handlerConfig.services).filter(
    (serviceName) => handlerConfig.services[serviceName].awaitResponse !== false
  );

  const promises = toWait.map((service) => {
    return new Promise<FetchedResult>((success, error) => {
      activeRequests.set(`${requestId}+${service}`, {
        id: requestId,
        channel: (handlerConfig.requestChannel ||
          config.responseChannel) as string,
        path,
        method,
        service,
        timeoutTicks:
          Date.now() + (handlerConfig.services[service].timeoutMS || 30000),
        startTime: Date.now(),
        onSuccess: success,
        onError: error,
      });
    });
  });

  try {
    return {
      aborted: false,
      results: await Promise.all(promises),
    };
  } catch (ex) {
    return {
      aborted: true,
      errorResult: ex,
    };
  }
}

/*
  Merge received results into a final response
*/
function mergeIntoResponse(
  requestId: string,
  collatedResults: CollatedResult
): HttpResponse | undefined {
  const config = configModule.get();
  if (!collatedResults.aborted) {
    let finalResponse: HttpResponse = { status: 200, content: undefined };

    for (const result of collatedResults.results) {
      if (result.ignore === false) {
        const handlerConfig = config.routes[result.path][
          result.method
        ] as HandlerConfig;
        if (handlerConfig.services[result.service].merge !== false) {
          if (result.serviceResult.response) {
            if (result.serviceResult.response.content) {
              /*
              If the response has already been redirected, you can't write on to it.
            */
              if (finalResponse.redirect) {
                return {
                  status: 500,
                  content: `${result.serviceResult.service} is redirecting the response to ${result.serviceResult.response.redirect} but content has already been added to the response.`,
                };
              } else {
                /*
                If current response is not an object and new result is an object, we throw an error. We can't merge an object on to a string.
              */
                if (typeof result.serviceResult.response.content === "object") {
                  if (typeof finalResponse.content === "undefined") {
                    finalResponse.content =
                      result.serviceResult.response.content;
                    finalResponse.contentType = "application/json";
                  } else {
                    if (typeof finalResponse.content !== "object") {
                      return {
                        status: 500,
                        content: `Cannot merge multiple types of content. ${
                          result.serviceResult.service
                        } is returned a json response while the current response is of type ${typeof finalResponse.content}.`,
                      };
                    } else {
                      const mergeField =
                        handlerConfig.services[result.serviceResult.service]
                          .mergeField;

                      finalResponse.content = mergeField
                        ? {
                            ...finalResponse.content,
                            [mergeField]: result.serviceResult.response.content,
                          }
                        : {
                            ...finalResponse.content,
                            ...result.serviceResult.response.content,
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
                      content: `${result.serviceResult.service} returned a response which will overwrite current response.`,
                    };
                  } else {
                    const mergeField =
                      handlerConfig.services[result.serviceResult.service]
                        .mergeField;

                    finalResponse.content = mergeField
                      ? { [mergeField]: result.serviceResult.response.content }
                      : result.serviceResult.response.content;
                  }
                }
              }

              /*
              Content type cannot be changed once set.
            */
              if (result.serviceResult.response.contentType) {
                if (
                  finalResponse.contentType &&
                  result.serviceResult.response.contentType !==
                    finalResponse.contentType
                ) {
                  return {
                    status: 500,
                    content: `${result.serviceResult.service} returned content type ${result.serviceResult.response.contentType} while the current response has content type ${finalResponse.contentType}.`,
                  };
                } else {
                  finalResponse.contentType =
                    result.serviceResult.response.contentType;
                }
              }
            }

            /*
            If the response content has already been modified previously, then you cannot redirect. If there's already a pending redirect, you cannot redirect again.
          */
            if (result.serviceResult.response.redirect) {
              if (finalResponse.content) {
                return {
                  status: 500,
                  content: `${result.serviceResult.service} is redirecting to ${result.serviceResult.response.redirect} but the current response already has some content.`,
                };
              } else if (finalResponse.redirect) {
                return {
                  status: 500,
                  content: `${result.serviceResult.service} is redirecting to ${result.serviceResult.response.redirect} but the response has already been redirected to ${finalResponse.redirect}.`,
                };
              } else {
                finalResponse.redirect = result.serviceResult.response.redirect;
              }
            }

            /*
            Cannot have multiple status codes.
            If results have differing 2xx codes, send 200.
            If results have 2xx and 4xx (or 3xx or 5xx), that's an error
          */
            if (result.serviceResult.response.status) {
              if (!finalResponse.status) {
                finalResponse.status = result.serviceResult.response.status;
              } else {
                if (
                  finalResponse.status !== result.serviceResult.response.status
                ) {
                  if (
                    finalResponse.status >= 200 &&
                    finalResponse.status <= 299 &&
                    result.serviceResult.response.status >= 200 &&
                    result.serviceResult.response.status <= 299
                  ) {
                    finalResponse.status = 200;
                  } else {
                    return {
                      status: 500,
                      content: `${result.serviceResult.service} is returning status code ${result.serviceResult.response.status} but the response already has its status set to ${finalResponse.status}.`,
                    };
                  }
                }
              }
            }

            /*
            We concat all cookies.
          */
            if (result.serviceResult.response.cookies) {
              finalResponse.cookies = (finalResponse.cookies || []).concat(
                result.serviceResult.response.cookies
              );
            }
          }
        }
      }
    }
    return finalResponse;
  } else {
    return collatedResults.errorResult.ignore === false
      ? collatedResults.errorResult.serviceResult.response
      : {
          status: 500,
          content: "Internal server error",
        };
  }
}
