# Retransmit

Retransmit is a broker that integrates data from multiple backend microservices and exposes them at HTTP endpoints or via WebSockets. For example, GET /users might need to fetch data from the 'user service' as well as the 'friends service'. Retransmit will create a response by contacting both services and merging their responses. If any of the requests to backend services fail, Retransmit can inform the other services so that a rollback can be performed.

As of now, Retransmit can talk to backend services via HTTP as well as Redis pub-sub (which has streaming super powers). Here's a diagram:

![Retransmit Diagram](https://user-images.githubusercontent.com/241048/82422447-140c0b80-9aa0-11ea-9caa-2b9c65839029.png)

For clients connecting via WebSockets, Retransmit can stream data coming from Redis pub-sub backends (explained further down). You can also connect to http backends via WebSockets, but they can only send a single response. More on this later.

## Installation

```sh
npm i -g retransmit
```

You need to create a configuration file first (given below). And then run Retransmit like this.

```sh
Retransmit -p PORT -c CONFIG_FILE
```

## Configuration

Configuration files are written in JavaScript. A basic configuration file looks like this.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        GET: {
          services: {
            userservice: {
              type: "http",
              url: "http://localhost:6666/users",
            },
            messagingservice: {
              type: "http",
              url: "http://localhost:6667/messages",
            },
          },
        },
      },
      // You can specify parameters in the url
      "/users/:id": {
        GET: {
          services: {
            userservice: {
              type: "http",
              url: "http://localhost:6666/users/:id",
            },
            messagingservice: {
              type: "http",
              url: "http://localhost:6667/messages/for/:id",
            },
          },
        },
      },
    },
  },
};
```

According to the configuration file above, Retransmit will accept GET requests on "/users" and pass the call to 'userservice' and 'messagingservice' at their corresponding urls. The data (if in JSON format) sent back by the two services are merged and sent back to the requesting client.

## Backend Services using Redis Pub-Sub

In addition to talking to HTTP backend services, Retransmit can talk to services via Redis pub-sub. Retransmit packages the HTTP call information into a JSON formatted string and publishes it on a Redis channel. The service could subscribe to the channel to receive these requests, and once the response is ready post it back on another channel - from where Retransmit will pick it up and send back to the client. The input and output channels can be specified in the configuration files.

Here's a simple example. Note that multiple services can listen on the same channels.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        GET: {
          services: {
            userservice: {
              type: "redis",
              requestChannel: "input",
            },
            messagingservice: {
              type: "redis",
              requestChannel: "input",
            },
          },
        },
      },
    },
    redis: {
      responseChannel: "output",
    },
  },
};
```

Retransmit will package an HTTP request in the following format (as JSON) and post it into the requestChannel. The receiving services need to parse the message as JSON and do subsequent processing.

```typescript
export type RedisServiceRequest = {
  id: string;
  type: "request" | "rollback";
  responseChannel: string;
  request: HttpRequest;
};

export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string;
  };
  body: any;
  headers: {
    [key: string]: string;
  };
};
```

Once the request is processed, the response needs to be published to the responseChannel mentioned in the request. Retransmit will pickup these responses, merge them, and pass them back to the caller. Retransmit will reconstruct an HTTP response from this information to send back to the client.

Responses posted back must be in the format given below.

```typescript
type RedisServiceResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

// where response is...
export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: HttpCookie[];
  headers?: IncomingHttpHeaders;
  content?: any;
  contentType?: string;
};

// and cookie is...
export type HttpCookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  overwrite?: boolean;
};
```

Redis connection parameters can be specified in the config file. If not specified, Retransmit will connect to localhost on the default redis port.

```js
module.exports = {
  // parts of config omitted for brevity
  redis: {
    host: "localhost",
    port: 13422,
  },
};
```

## Merging

Only JSON responses are merged. Merging happens in the order in which the services are defined. So if two services return values for the same field, the value from the first service gets overwritten by that from the second.

To avoid this you could choose not to return that same fields. However, if that's not possible you could specify a mergeField for a service in the configuration file. When a mergeField is defined for a service, values returned by the service go into the specified field in the final response.

In the following example, the data coming from userservice is added to the 'userData' field and that from messagingservice is added to the 'messagingData' field.

```js
module.exports = {
  // parts of config omitted for brevity
  userservice: {
    type: "redis",
    requestChannel: "input",
    mergeField: "userData",
  },
  messagingservice: {
    type: "redis",
    requestChannel: "input",
    mergeField: "messagingData",
  },
};
```

You can also choose not to merge data from a certain service with the 'merge' flag in configuration.

```js
module.exports = {
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    requestChannel: "inputs",
    merge: false,
  },
};
```

## Not waiting for responses

There might be services which you just want to call, and not wait for results. Use the 'awaitResponse' property to configure this.

```js
module.exports = {
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    requestChannel: "inputs",
    awaitResponse: false,
  },
};
```

## Modifying Requests and Responses

Retransmit gives you several hooks to modify requests and responses flying through it.

The onRequest hook allows you to edit an incoming web request before it is processed by Retransmit. If you would like to handle it yourself and bypass Retransmit, simply pass `{ handled: true }` as the return value of onRequest.

Similarly, onResponse does the same thing for responses. It lets you modify the response that will be returned by Retransmit. If you want Retransmit to do no further processing and want to handle it yourself, pass `{ handled: true }` as the return value of onResponse.

```typescript
/*
  Application Config
*/
module.exports = {
  http: {
    routes: {
      services: {
        userservice: {
          type: "redis",
          requestChannel: "input",
        },
      },
    },
    redis: {
      responseChannel: "output",
    },
    /*
    Signature of onRequest
    onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
  */
    onRequest: async (ctx) => {
      ctx.body = "Works!";
      return { handled: true };
    },
    /*
    Same thing for responses

    onResponse?: (
      ctx: HttpRequestContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  */
    onResponse: async (ctx) => {
      ctx.body = "Handled!";
      return { handled: true };
    },
  },
};
```

The context (ctx in the example above) passed into the hooks is a HttpRequestContext instance having the following methods.

```typescript
abstract class HttpRequestContext {
  abstract getPath(): string;

  abstract getParams(): {
    [key: string]: string;
  };

  abstract getMethod(): HttpMethods;

  abstract getQuery(): {
    [key: string]: string;
  };

  abstract getRequestHeaders(): {
    [key: string]: string;
  };

  abstract getRequestBody(): any;

  abstract getResponseStatus(): number;
  abstract setResponseStatus(status: number): void;

  abstract getResponseBody(): any;
  abstract setResponseBody(value: any): void;

  abstract getResponseHeader(field: string): string;
  abstract setResponseHeader(field: string, value: string | string[]): void;

  abstract getResponseType(): string;
  abstract setResponseType(type: string): void;

  abstract getCookie(name: string): string | undefined;
  abstract setCookie(
    name: string,
    value: string,
    opts?: {
      path?: string;
      domain?: string;
      secure?: boolean;
      httpOnly?: boolean;
      maxAge?: number;
      overwrite?: boolean;
    }
  ): void;

  abstract redirect(where: string): void;
}
```

Retransmit lets you override requests and responses individually for each service. They work just the same as the global modifiers we just discussed, but apply to individual services. Here's how you specify it.

```typescript
module.exports = {
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    requestChannel: "input",

    /*
      Signature of onRequest
      onRequest?: (ctx: HttpRequestContext) => Promise<{ handled: boolean }>;
    */
    onRequest: async (ctx) => {
      ctx.body = "Works!";
      return { handled: true };
    },
    /*
      Same thing for responses

      onResponse?: (
        ctx: HttpRequestContext,
        response: any
      ) => Promise<{ handled: boolean }>;
    */
    onResponse: async (ctx) => {
      ctx.body = "Handled!";
      return { handled: true };
    },
  },
};
```

## Authentication

The onRequest hook can be used to Authentication.

```typescript
module.exports = {
  http: {
    routes: {
      "/users": {
        POST: {
          services: {
            userservice: {
              type: "redis",
              requestChannel: "input",
              mergeField: "userData",
            },
          },
        },
      },
    },
    redis: {
      responseChannel: "output",
    },
    onRequest: async (ctx) => {
      const headers = ctx.getRequestHeaders();
      const isAuthenticated = headers["token"] === "very_very_secret";
      if (!isAuthenticated) {
        ctx.setStatus(401);
        ctx.setResponseBody("No cookie for you.");
        return { handled: true };
      }
    },
  },
};
```

## Rolling back on error

When a service fails, Retransmit can notify the other services that an error has occured - so that they can rollback changes if necessary.

For Http Services, the rollback function is called with the original request and the rollback function is expected to return new request information which will be used to invoked a rollback api on the backend service.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        POST: {
          services: {
            userservice: {
              type: "http",
              url: "http://localhost:6666/users",
              // Rollback url to call
              rollback: (req) => {
                return {
                  params: req.params,
                  path: `/admin/users/remove/${req.body.username}`,
                  method: "DELETE",
                  headers: {
                    "my-secret": "somesecret",
                  },
                };
              },
            },
            accountsservice: {
              type: "http",
              url: "http://localhost:6666/accounts",
            },
            messagingservice: {
              // omitted...
            },
          },
        },
      },
    },
  },
};
```

For Redis, the rollback posts the following data into the same channel into which the request was originally published. The service can take necessary compensating action.

```typescript
export type RedisServiceRequest = {
  id: string;
  type: "rollback";
  request: HttpRequest;
};
```

## Logging errors

The onError handler lets you log errors that happen in the pipeline. It can be specified globally, or for all services on a route, or specifically for a service. For error handlers specified globally or for all services in a route, the responses parameter contains repsonses obtained from various services for that request. For a service specific error handler, it contains only a single response. See configuration below.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        POST: {
          services: {
            messagingservice: {
              type: "redis",
              requestChannel: "input",
              responseChannel: "output",
              onError: async (response, request) => {
                console.log("Failed in messagingservice.");
              },
            },
          },
          onError: async (responses, request) => {
            console.log("A service failed in POST /users.");
          },
        },
      },
    },
    /*
    Signature
    onError?: (
      responses: FetchedResponse[],
      request: HttpRequest
    ) => any;
  */
    onError: async (responses, request) => {
      console.log("Something failed somewhere.");
    },
  },
};
```

## Streaming Responses via Web Sockets

Clients opening a Web Socket connection with Retransmit can receive streaming event data from backend services, as well as communicate with them asynchronously.

This configuration lets clients open an WebSocket connection to "/liveupdates" and get streaming responses from the quoteservice and the alertservice.

```typescript
/*
  Application Config
*/
module.exports = {
  webSocket: {
    routes: {
      "/liveupdates": {
        services: {
          quoteservice: {
            type: "redis",
            requestChannel: "input",
            responseChannel: "output",
          },
          alertservice: {
            type: "http",
            url: "http://localhost:6454/alerts",
            disconnectUrl: "http://localhost:6454/disconnect",
            pollingInterval: 10000,
          },
        },
      },
    },
  },
};
```

Here's an example of how to use Retransmit WebSockets from a web client.

```js
const mySocket = new WebSocket("wss://www.example.com/liveupdates");
mySocket.send(
  JSON.stringify({
    action: "GET_QUOTE",
    stock: "GOOG",
  })
);
```

Doing WebSockets with Redis Services is easy. For the example above, the Redis Service will receive the following message (as a string) if subscribed to the configured requestChannel.

```json
{
  "id": "sl98sndflksdlfksomeid",
  "type": "request",
  "responseChannel": "output.instanceid",
  "request": {
    "body": {
      "action": "GET_QUOTE",
      "stock": "GOOG"
    }
  }
}
```

Sending responses is also fairly simple - just keep pushing messages in the following format to the responseChannel (which you received in the request above) and Retransmit will stream them to the client.

```json
{
  "id": "sl98sndflksdlfksomeid",
  "service": "quoteservice",
  "response": {
    "quotes": [{ "ticker": "GOOG", "price": 1410.4 }]
  }
}
```

WebSocket requests to Http Services come as an Http POST to the configured Url. The response is sent back to the WebSocket client. In addition, by specifying a pollingInterval, Retransmit can check for newer updates from the Http Service and send those responses to the WebSocket client.

// TODO example.

## Handling Disconnect Events

// TODO

## Authentication for WebSockets

Authentication for WebSocket clients happen during the time of establishing the connection.

## Modifying Requests and Responses

// TODO

## Other Options

- timeout: Can be specified for each service. In milliseconds.
- awaitResponse: Can be specified for each service. Setting this to false makes Retransmit not wait for the response.
- merge: Can be specified for each service. Settings this to false makes Retransmit not merge the response.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        POST: {
          services: {
            messagingservice: {
              type: "redis",
              requestChannel: "input",
              // Timeout defaults to 30s
              timeout: 100000,
            },
            notificationservice: {
              type: "http",
              url: "http://notify.example.com/users",
              // Do not wait for this response
              awaitResponse: false,
            },
            accountservice: {
              type: "http",
              url: "http://accounts.example.com/online",
              // Do not merge the response from this service
              merge: false,
            },
          },
        },
      },
    },
    redis: {
      responseChannel: "output",
    },
  },
};
```

## Scaling

Retransmit is horizontally scalable. You can place as many nodes behind a load balancer as you want.

In addition Retransmit has a built-in load balancing feature specific to Redis-based services. To do this, your redis service instances should be subscribing to numbered channels rather than a single channel. For example, userservice-instance1 could subscribe to "userinput0", userservice-instance2 could subscribe to "userinput1" etc.

Then, by specifiying the numRequestChannels option in the redis service's configuration, you can get Retransmit to randomly choose a channel for posting the incoming request. Note that the channels need to be numbered from 0 onwards.

```js
module.exports = {
  http: {
    routes: {
      "/users": {
        POST: {
          services: {
            messagingservice: {
              type: "redis",
              requestChannel: "input",
              // Specify 10 channels
              // Instances need to subscribe to input0 to inputs9
              numRequestChannels: 10,
            },
          },
        },
      },
    },
    redis: {
      responseChannel: "output",
    },
  },
};
```

## About

This software has an MIT license. You can freely use it in commercial work under the terms of the license.
For paid support (or consulting gigs and online corporate training), contact me on jeswinpk@agilehead.com
