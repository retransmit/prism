// import { HttpMethods, UserAppConfig } from "../../../types";
// import { startBackends, getResponse } from "../../utils/http";
// import { TestAppInstance } from "../../test";
// import got from "got";
// import startTestApp from "../startTestApp";

// export default async function (app: TestAppInstance) {
//   it(`tests cluster mode`, async () => {
//     const appControl = await startTestApp({ config });

//     // Start mock servers.
//     const backendApps = startBackends([
//       {
//         port: 6666,
//         routes: [
//           {
//             path: "/users",
//             method: "GET",
//             response: { body: `GET: Everything worked.` },
//           },
//         ],
//       },
//     ]);

//     app.appControl = appControl;
//     app.mockHttpServers = backendApps;

//     const { port } = appControl;
//     const promisedResponse = got(`http://localhost:${port}/users`, {
//       method: "GET",
//       retry: 0,
//     });

//     const serverResponse = await getResponse(promisedResponse);
//     serverResponse.statusCode.should.equal(200);
//     serverResponse.body.should.equal(`GET: Everything worked.`);
//   });
// }
