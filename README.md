# Retransmit

Retransmit is a broker that integrates data from multiple backend microservices and exposes them at HTTP endpoints. For example, GET /users might need to fetch data from the 'user service' as well as the 'friends service'. Retransmit will create a response by contacting both services and then merging the result as specified. As of now, retransmit can talk to backend services via HTTP as well as Redis pub-sub. 

Here's a diagram:

[IMAGE]





Often a single request needs to be fulfilled by calling multiple services. 

This can be done in two ways: a) By making the client call the two services individually (a bad idea in most situations because one of them could fail), b) have a 



When a client request (such as an ajax call from a browser) needs to be fulfilled by multile services, it is not ideal to have the client call each service individually - since client networks are unreliable and some of those network calls could fail.

Retransmit tries to solve this problem by acting as a co-ordinator:

- Receive client requests via http
- Place it on a redis pub-sub channel
- Wait for responses from participating services
- Merge the responses
- Send the merged result back to the client
- Via config, you can specify which service failures must abort the request
- When a request is aborted (due to one or more services failing), a message is added to redis so that services can do a compensating rollback
- Optionally validate a JWT. JWT can also be passed through to the services.

## Installation

1. Install via npm.

```sh
npm i -g retransmit
```

2. Create a postgres database and create the tables with scripts found under the 'db' directory.

3. Setup redis.

## Running

You'd use something like this.

```sh
retransmit -p 8080 -c /path/to/your/config
```

An example directory containing config files (which are JS files) can be found under the 'example-config' directory.
This is where you specify database connection strings, jwt and oauth keys etc.

## Requests

Routes to be handled by disspate are specified in the app configuration file. You can find samples in the example-config directory.

Configuration looks like this:

```typescript
module.exports = {
  //...
  routes: {
    "/users": {
      POST: {
        services: {
          userService: {
            //...
          },
          quotesService: {
            //...
          },
        },
      },
      GET: {
        services: {
          userService: {
            //...
          },
        },
      },
    },
  },
};
```

The example above defines the "/users" route configuration for GET and POST methods. In this example, when the browser sends a POST request to /users, disspate will add the request information to the queue for further processing by the two services (userService and quotesService) defined above. These services should post the data back into the redis channels after completing their respective operations. Retransmit will collate the requests and send it back to the client as the response.

Retransmit also has an async mode where the request completes immediately with a completion id. Async is enabled by add a query string parameter: /users?async=true. Clients can poll /completion/:completion-id to get the current status or the final result if available.

## Request Logging

Optionally you can write all incoming requests to a database. This will be slow.

## Scaling Up and Load Balancing

Retransmit can optionally push messages into channel names selected in a round-robin fashion - such as user1, user2, user3 etc. This allows individual instances belonging to a cluster to subscribe to channels selectively, thereby enabling a very basic load-balancing mechanism. The numChannels parameter in config (see example-config) defines the number of channels to create of a certain type. Participating services must make sure they subscribe to all these channels.
