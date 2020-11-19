module.exports = {
  http: {
    routes: {
      "/dashboard": {
        GET: {
          services: {
            accountservice: {
              type: "http",
              url: "http://localhost:6666/account",
            },
            messagingservice: {
              type: "http",
              url: "http://localhost:6667/messages",
            },
          },
        },
      },
    },
  },
};
