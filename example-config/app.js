module.exports = {
  jwt: {
    fieldName: "jwt-data",
    required: true,
    requiredFields: {
      user: "*",
    },
  },
  logging: {
    jwt: false,
  },
  routes: {
    "/users": {
      methods: ["POST"],
      services: {
        userService: {
          validateJwt: true,
          passJwt: true,
          awaitResponse: true,
          mergeResponse: true,
          mergeInto: "field",
          abortOnError: true,
          logErrors: true,
          timeoutMS: 0,
        },
      },
      numChannels: 4,
    },
  },
};
