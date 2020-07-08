// import { join } from "path";

// export default async function () {
//   it(`responds to GET request from a cluster`, async () => {
//     const configFile = join(__dirname, "config.js");
//     const appControl = await startRetransmitTestInstance({ config });

//     // Start mock servers.
//     const backendApps = startBackends([
//       {
//         port: 6666,
//         routes: [
//           {
//             path: "/users",
//             method: "POST",
//             handleResponse: async (ctx) => {
//               ctx.body = `Contains headers: ${Object.keys(
//                 ctx.headers
//               ).filter((x) => x.startsWith("x-"))}`;
//             },
//           },
//         ],
//       },
//     ]);

//     app.appControl = appControl;
//     app.mockHttpServers = backendApps;

//     const { port } = appControl;
//     const promisedResponse = got(`http://localhost:${port}/users`, {
//       method: "POST",
//       headers: {
//         "x-app-instance": "myinst",
//         "x-something-else": "somethingelse",
//       },
//       json: { username: "jeswin" },
//       retry: 0,
//     });
//     const serverResponse = await getResponse(promisedResponse);
//     serverResponse.statusCode.should.equal(200);
//     serverResponse.body.should.equal("Contains headers: x-something-else");
//   });
// }
