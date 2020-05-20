# Retransmit

Retransmit is a broker that integrates data from multiple backend microservices and exposes them at HTTP endpoints. For example, GET /users might need to fetch data from the 'user service' as well as the 'friends service'. Retransmit will create a response by contacting both services and merging their responses. If any of the requests to backend services fail, retransmit can inform the other services so that a rollback can be performed.

As of now, retransmit can talk to backend services via HTTP as well as Redis pub-sub. Here's a diagram:

[IMAGE]

## Installation

```sh
npm i -g retransmit
```

You need to create a configuration file first (given below). And then run retransmit like this.

```sh
retransmit -p PORT -c CONFIG_FILE
```

## Configuration

Configuration files are written in JavaScript. A basic configuration file looks like this.

```js
module.exports = {
  routes: {
    "/users": {
      GET: {
        services: {
          userservice: {
            type: "http",
            config: {
              path: "http://localhost:6666/users",
            },
          },
          messagingservice: {
            type: "http",
            config: {
              path: "http://localhost:6667/messages",
            },
          },
        },
      },
    },
  },
};
```

According to the configuration file above, retransmit will accept GET requests on "/users" and pass the call to 'userservice' and 'messagingservice' at their corresponding urls. The data (if in JSON format) sent back by the two services are merged and sent back to the requesting client.

## Redis Pub-Sub

In addition to talking to HTTP backend services, retransmit can talk to services via Redis pub-sub. Retransmit packages the HTTP call information into a JSON format string and publishes it as a message on Redis. The channels on which the message gets published is again part of the configuration.

Here's a simple example. Note that multiple services can listen on the same channels.

```js
module.exports = {
  routes: {
    "/users": {
      GET: {
        services: {
          userservice: {
            type: "redis",
            config: {
              requestChannel: "inputs",
              responseChannel: "outputs",
            },
          },
          messagingservice: {
            type: "redis",
            config: {
              requestChannel: "inputs",
              responseChannel: "outputs",
            },
          },
        },
      },
    },
  },
};
```

Retransmit will package an HTTP request in the following format (as JSON) and post it into the requestChannel. The receiving services need to parse the message as JSON and do subsequent processing.

```typescript
export type RedisServiceRequest = {
  id: string;
  type: string;
  data: HttpRequest;
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

Once the request is processed, the response needs to be published on the responseChannel. Retransmit will pickup these responses, merge them, and pass them back to the caller.

Responses posted into the responseChannels need to be in the following format. Retransmil will reconstruct an HTTP response from this information to send back to the client.

```typescript
type RedisServiceResponse = {
  id: string;
  service: string;
  response: HttpResponse;
};

type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    overwrite?: boolean;
  }[];
  headers?: IncomingHttpHeaders;
  content?: any;
  contentType?: string;
};
```

Redis connection parameters can be specified in the config file.

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

To avoid this you could choose not to return that same fields. However, if that's not possible you could specify a mergeField for a service in the configuration file. When a mergeField is defined for a service, values returned by the service go into that field in the final response.

In the following example, the data coming from userservice is added to the 'userData' field and that from messagingservice is added to the 'messagingData' field.

```js
module.exports = {
  // parts of config omitted for brevity
  userservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    mergeField: "userData",
  },
  messagingservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    mergeField: "messagingData",
  },
};
```

You can also choose not to merge data from a certain service with the 'merge' flag in configuration.

```js
{
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    merge: false
  },
}
```

## Not waiting for responses

There might be services which you just want to call, and not wait for results. Use the 'awaitResponse' property to configure this.

```js
{
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    awaitResponse: false
  },
}
```

## Modifying Requests and Responses

Retransmit gives you several options to modify requests and responses flying throught it.

The modifyRequest hook allows you to edit an incoming web request before it is processed by retransmit. If you would like to handle it yourself and bypass retransmit, simply pass `{ handled: true }` as the return value of modifyRequest.

Similarly, modifyResponse does the same thing for responses. It lets you modify the response that will be returned by retransmit. If you want retransmit to do no further processing and want to handle it yourself, pass `{ handled: true }` as the return value of modifyResponse.

```typescript
/*
  Application Config
*/
module.exports = {
  routes: {
    userservice: {
      type: "redis";
      config: {
        requestChannel: "inputs";
        responseChannel: "outputs";
      };
      mergeField: "userData";
    };
  };
  /*
    Signature of modifyRequest
    modifyRequest?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
  */
  modifyRequest: async (ctx) => { ctx.body = "Works!"; return { handled: true }; }
  /*
    Same thing for responses

    modifyResponse?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  */
  modifyResponse: async (ctx) => { ctx.body = "Handled!"; return { handled: true } }
}
```

Retransmit also lets you override requests and responses individually for each services. They work just the same as the global modifiers we just discussed, but apply to individual services. Here's where you specify it.

```typescript
module.exports = {
  // parts of config omitted for brevity
  messagingservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    /*
      Signature of modifyRequest
      modifyRequest?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    */
    modifyRequest: async (ctx) => {
      ctx.body = "Works!";
      return { handled: true };
    },
    /*
      Same thing for responses

      modifyResponse?: (
        ctx: IRouterContext,
        response: any
      ) => Promise<{ handled: boolean }>;
    */
    modifyResponse: async (ctx) => {
      ctx.body = "Handled!";
      return { handled: true };
    },
  },
};
```

## Rolling back on error

When a service fails, retransmit can notify the other services that the request is going to return an error.

For Http Services, the rollbackUrl specified in the configuration is called with the same request data. If modifyRollbackRequest is specified, you could change the url, method and parameters for the rollback call.

```js
module.exports = {
  routes: {
    "/users": {
      POST: {
        services: {
          userservice: {
            type: "http",
            config: {
              path: "http://localhost:6666/users",
              // Rollback url to call
              rollbackpath: "http://localhost:6666/users/remove",
            },
          },
          accountsservice: {
            type: "http",
            config: {
              path: "http://localhost:6666/accounts",
            },
            // The rollback call goes as an HTTP PUT to a different url.
            modifyRollbackRequest: (req) => {
              return {
                ...req,
                path: "http://localhost:6666/users/remove",
                method: "PUT",
              };
            },
          },
          messagingservice: {
            // omitted...
          },
        },
      },
    },
  },
};
```

For Redis, the rollback posts the following data into the same channel into which the request was originally published. The service should take necessary compensating action.

```typescript
export type RedisServiceRequest = {
  id: string;
  type: "rollback";
  data: HttpRequest;
};
```

## Logging errors

The logError handler lets you log errors that happen in the pipeline. It can be specified globally, for all services on a route, or specifically for a service. For error handlers specified globally or for all services in a route, the responses parameter contains repsonses obtained from various services for that request. For a service specific error handler, it contains only a single response. See configuration below.

```js
module.exports = {
  "/users": {
    "POST": {
      services: messagingservice: {
        type: "redis",
        config: {
          requestChannel: "inputs",
          responseChannel: "outputs",
        },
        /*
          Note the difference. Contains only one response.
          logError?: (
            response: HttpResponse,
            request: HttpRequest
          ) => Promise<void>;
        */
        logError: async (response, request) => {
          console.log("Failed in messagingservice.");
        },
      },
      logError: async (responses, request) => {
        console.log("A service failed in POST /users.");
      },
    }
  }

  /*
    Signature
    logError?: (
      responses: FetchedResponse[],
      request: HttpRequest
    ) => Promise<void>;
  */
  logError: async (responses, request) => {
    console.log("Something failed somewhere.");
  },
};
```

## Other Options

- timeout: Can be specified for each service. In milliseconds.
- awaitResponse: Can be specified for each service. Setting this to false makes retransmit not wait for the response.
- merge: Can be specified for each service. Settings this to false makes retransmit not merge the response.

```js
module.exports = {
  "/users": {
    POST: {
      services: {
        messagingservice: {
          type: "redis",
          config: {
            requestChannel: "inputs",
            responseChannel: "outputs",
          },
          // Timeout defaults to 30s
          timeout: 100000,
        },
        notificationservice: {
          type: "http",
          config: {
            path: "http://notify.example.com/users",
          },
          // Do not wait for this response
          awaitResponse: false,
        },
        accountservice: {
          type: "http",
          config: {
            path: "http://accounts.example.com/online",
          },
          // Do not merge the response from this service
          merge: false,
        },
      },
    },
  },
};
```

## Scaling

Retransmit is horizontally scalable. You can place as many nodes behind a load balancer as you want. 

In addition retransmit has a built-in load balancing feature specific to Redis-based services. To do this, your redis service instances should be subscribing to numbered channels rather than a common channel. For example, service-instance1 could subscribe to "userinput0", and service-instance2 could subscribe to "userinput1" etc.

Then, by specifiying the numRequestChannels option in a redis service's configuration, you can get retransmit to randomly choose on a channel for posting the incoming request. Note that the channels need to be numbered from 0 onwards.

```js
module.exports = {
  "/users": {
    POST: {
      services: {
        messagingservice: {
          type: "redis",
          config: {
            requestChannel: "inputs",
            responseChannel: "outputs",
            // Specify 10 channels
            // Instances need to subscribe to input0 to inputs9
            numRequestChannels: 10
          },
        },
      },
    },
  },
};
```

## About

This software has an MIT license. You can freely use it in commercial work under the terms of the license.
For paid support (or other consulting gigs), contact me on jeswinpk@agilehead.com
