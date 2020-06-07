// import request = require("supertest");
// import { doPubSub } from "../../../../../utils/redis";
// import WebSocket from "ws";
// import { TestAppInstance } from "../../../../../test";

// export default async function (app: TestAppInstance) {
//   it(`gets responses from redis backends`, async () => {
//     const config = {
//       instanceId: random(),
//       http: {
//         routes: {
//           "/users": {
//             POST: {
//               services: {
//                 userservice: {
//                   type: "redis" as "redis",
//                   requestChannel: "input",
//                 },
//                 messagingservice: {
//                   type: "redis" as "redis",
//                   requestChannel: "input",
//                 },
//               },
//               genericErrors: true,
//             },
//           },
//         },
//         redis: {
//           responseChannel: "output",
//         },
//       },
//     };

//     const serviceResults = [
//       {
//         id: "someid",
//         service: "quoteservice",
//         response: "GOOG: 1425.1",
//       },
//       {
//         id: "someid",
//         service: "quoteservice",
//         response: "GOOG: 1420.1",
//       },
//     ];

//     const result = await doPubSub(
//       app,
//       config,
//       serviceResults,
//       (success, getJson) => {
//         request(app.servers.httpServer)
//           .post("/users")
//           .send({ hello: "world" })
//           .set("origin", "http://localhost:3000")
//           .then((x) => success([x, getJson()]));
//       }
//     );

//     const [response, json] = result;
//     json.request.headers.origin.should.equal("http://localhost:3000");
//     response.status.should.equal(500);
//     response.text.should.equal("Internal Server Error.");
//   });
// }
