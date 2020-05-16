import { IRouterContext } from "koa-router";
import * as configModule from "./config";
import {
  HttpMethods,
  ServiceResult,
  HttpResponse,
  HandlerConfig,
  TrackingData,
  IAppConfig,
} from "./types";
import randomId from "./random";
import redis, { RedisClient } from "redis";

let subscriber: RedisClient;
let publisher: RedisClient;

type RequestData = {
  id: string;
  path: string;
  channel: string;
  timeoutTicks: number;
  method: string;
  service: string;
  startTime: number;
  ignoreErrors: boolean;
  onSuccess: (result: TrackingData & ServiceResult) => void;
  onError: (result: TrackingData & ServiceResult) => void;
};

const activeRequests = new Map<string, RequestData>();

export async function init() {
  const config = configModule.get();

  subscriber = redis.createClient(config.redis.options);
  publisher = redis.createClient(config.redis.options);

  // Setup subscriptions
  if (config.responseChannel) {
    subscriber.subscribe(config.responseChannel);
  }

  for (const route in config.routes) {
    for (const method in config.routes[route]) {
      const handlerConfig = config.routes[route][method as HttpMethods];
      if (handlerConfig.responseChannel) {
        subscriber.subscribe(handlerConfig.responseChannel);
      }
    }
  }

  subscriber.on("message", processMessages);

  // Some services may never respond. Fail them.
  setInterval(cleanupMessages, config.timeoutCheckIntervalMS || 30000);
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
      activeRequest.onSuccess({ time: processingTime, ...serviceResult });
    } else {
      if (activeRequest.ignoreErrors === true) {
        activeRequest.onSuccess({
          id: activeRequest.id,
          time: processingTime,
          success: true,
          ignore: true,
        });
      } else {
        activeRequest.onError({ time: processingTime, ...serviceResult });
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
        id,
        time: Date.now() - requestData.startTime,
        success: false,
      });
    } else {
      requestData.onError({
        id,
        time: Date.now() - requestData.startTime,
        success: false,
        response: {
          content: `${requestData.service} timed out.`,
          status: 408,
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

      const serviceResults: (TrackingData &
        ServiceResult)[] = await waitForServiceResults(
        requestId,
        ctx.path,
        method,
        handlerConfig,
        config
      );

      let mergedResult: ServiceResult = mergeResponses(
        requestId,
        serviceResults
      );

      // Add a rollback to the channel on error
      if (!mergedResult.success) {
        const errorPayload = {
          id: requestId,
          type: "rollback",
          data: payload.data,
        };
        publisher.publish(channelId, JSON.stringify(errorPayload));
      }

      // See if there are any custom handlers for final response
      if (config.handlers && config.handlers.response) {
        const result = await config.handlers.response(ctx, mergedResult);
        if (result.handled) {
          return;
        }
      }

      // Send response back to the client.
      if (mergedResult.response) {
        const response = mergedResult.response;

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
): Promise<(TrackingData & ServiceResult)[]> {
  const toWait = Object.keys(handlerConfig.services).filter(
    (serviceName) => handlerConfig.services[serviceName].awaitResponse
  );

  const promises = toWait.map((service) => {
    return new Promise<TrackingData & ServiceResult>((success, error) => {
      activeRequests.set(requestId, {
        id: requestId,
        channel: (handlerConfig.requestChannel ||
          config.responseChannel) as string,
        path: path,
        method: method,
        service,
        timeoutTicks: Date.now() + handlerConfig.services[service].timeoutMS,
        startTime: Date.now(),
        ignoreErrors: handlerConfig.services[service].abortOnError,
        onSuccess: success,
        onError: error,
      });
    });
  });

  try {
    return await Promise.all(promises);
  } catch (ex) {
    return [ex];
  }
}

/*
  Merge received results into a final response
*/
function mergeResponses(
  requestId: string,
  serviceResults: (TrackingData & ServiceResult)[]
): ServiceResult {
  let finalResponse = serviceResults.reduce(
    (acc, result) => {
      if (result.ignore !== false) {
        if (result.response) {
          if (result.response.content) {
            if (typeof result.response.content === "object") {
              acc.content = { ...acc.content, ...result.response.content };
            } else {
              acc.content = result.response.content;
            }
            if (result.response.contentType) {
              acc.contentType = result.response.contentType;
            }
          }
          if (result.response.redirect) {
            acc.redirect = result.response.redirect;
          }
          if (result.response.status) {
            acc.status = result.response.status;
          }
          if (result.response.cookies) {
            acc.cookies = (acc.cookies || []).concat(result.response.cookies);
          }
        }
      }

      return acc;
    },
    { status: 200, content: "" } as HttpResponse
  );

  return {
    id: requestId,
    success: true,
    response: finalResponse,
  };
}
