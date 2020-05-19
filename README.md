# Retransmit

## What is Retransmit?

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
              url: "http://localhost:6666/users",
            },
          },
          messagingservice: {
            type: "http",
            config: {
              url: "http://localhost:6667/messages",
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

## Merging

Only JSON responses are merged. Merging happens in the order in which the services are defined. So if two services return values for the same field, the value from the first service gets overwritten by that from the second.

To avoid this you could choose not to return that same fields. However, if that's not possible you could specify a mergeField for a service in the configuration file. When a mergeField is defined for a service, values returned by the service go into that field in the final response.

In the following example, the data coming from userservice is added to the 'userData' field and that from messagingservice is added to the 'messagingData' field.

```js
{
  // parts of config omitted for brevity
  userservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    mergeField: "userData"
  },
  messagingservice: {
    type: "redis",
    config: {
      requestChannel: "inputs",
      responseChannel: "outputs",
    },
    mergeField: "messagingData"
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

## Choosing not to merge data from a Service

