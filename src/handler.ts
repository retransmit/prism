import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import {
  HttpMethods,
  ServiceResult,
  HttpResponse,
  HandlerConfig,
  IAppConfig,
  CollatedResult,
  ChannelResult,
} from "./types";
import randomId from "./random";
import redis = require("redis");

let subscriber: redis.RedisClient;
let publisher: redis.RedisClient;

type RequestData = {
  id: string;
  path: string;
  channel: string;
  timeoutTicks: number;
  method: string;
  service: string;
  startTime: number;
  ignoreErrors: boolean;
  onSuccess: (result: ChannelResult) => void;
  onError: (result: ChannelResult) => void;
};

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
function processMessages(channel: string, messageString: string) {
  const serviceResult = JSON.parse(messageString) as ServiceResult;
  const activeRequest = activeRequests.get(serviceResult.id);

  if (activeRequest && activeRequest.channel === channel) {
    const processingTime = Date.now() - activeRequest.startTime;

    if (serviceResult.success) {
      activeRequest.onSuccess({
        time: processingTime,
        ignore: false,
        result: serviceResult,
      });
    } else {
      if (activeRequest.ignoreErrors === true) {
        activeRequest.onSuccess({
          time: processingTime,
          ignore: true,
        });
      } else {
        activeRequest.onError({
          time: processingTime,
          ignore: false,
          result: serviceResult,
        });
      }
    }
  }
}

/*
  Scavenging for timed out messages
*/
function cleanupMessages() {
  const entries = activeRequests.entries();

  const timedOut: [string, RequestData][] = [];
  for (const [id, requestData] of entries) {
    if (Date.now() > requestData.timeoutTicks) {
      timedOut.push([requestData.id, requestData]);
    }
  }

  for (const [id, requestData] of timedOut) {
    if (requestData.ignoreErrors === true) {
      requestData.onSuccess({
        time: Date.now() - requestData.startTime,
        ignore: true,
      });
    } else {
      requestData.onError({
        time: Date.now() - requestData.startTime,
        ignore: false,
        result: {
          id: requestData.id,
          success: false,
          response: {
            content: `${requestData.service} timed out.`,
            status: 408,
          },
        },
      });
    }
    activeRequests.delete(id);
  }
}

/*
  This handles HTTP requests from various clients.
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

      const collatedResult: CollatedResult = await waitForServiceResults(
        requestId,
        ctx.path,
        method,
        handlerConfig,
        config
      );

      let response = mergeIntoResponse(requestId, collatedResult);

      // Add a rollback to the channel on error
      if (collatedResult.aborted) {
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
        // Redirect and return
        if (response.redirect) {
          ctx.redirect(response.redirect);
          return;
        }

        // HTTP status
        if (response.status) {
          ctx.status = response.status;
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

        // Content type
        if (response.contentType) {
          ctx.type = response.contentType;
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
  method: string,
  handlerConfig: HandlerConfig,
  config: IAppConfig
): Promise<CollatedResult> {
  const toWait = Object.keys(handlerConfig.services).filter(
    (serviceName) => handlerConfig.services[serviceName].awaitResponse !== false
  );

  const promises = toWait.map((service) => {
    return new Promise<ChannelResult>((success, error) => {
      activeRequests.set(requestId, {
        id: requestId,
        channel: (handlerConfig.requestChannel ||
          config.responseChannel) as string,
        path: path,
        method: method,
        service,
        timeoutTicks:
          Date.now() + (handlerConfig.services[service].timeoutMS || 30000),
        startTime: Date.now(),
        ignoreErrors: handlerConfig.services[service].abortOnError === false,
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
  collatedResult: CollatedResult
): HttpResponse | undefined {
  if (!collatedResult.aborted) {
    let finalResponse = collatedResult.results.reduce(
      (acc, result) => {
        if (result.ignore === false) {
          if (result.result.response) {
            if (result.result.response.content) {
              if (typeof result.result.response.content === "object") {
                acc.content = {
                  ...acc.content,
                  ...result.result.response.content,
                };
              } else {
                acc.content = result.result.response.content;
              }
              if (result.result.response.contentType) {
                acc.contentType = result.result.response.contentType;
              }
            }
            if (result.result.response.redirect) {
              acc.redirect = result.result.response.redirect;
            }
            if (result.result.response.status) {
              acc.status = result.result.response.status;
            }
            if (result.result.response.cookies) {
              acc.cookies = (acc.cookies || []).concat(
                result.result.response.cookies
              );
            }
          }
        }
        return acc;
      },
      { status: 200, content: "" } as HttpResponse
    );
    return finalResponse;
  } else {
    return collatedResult.errorResult.ignore === false
      ? collatedResult.errorResult.result.response
      : {
          status: 500,
          content: "Internal server error",
        };
  }
}
