const publicKey = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI9Jm7T8/yzNyyq2Tl1VwAehKiWcMeOJ
cvOMkcnWQSyYic4X5e3MU7B5nHMrdFO+L35dlHc0CgqyF72H/tMs4D0CAwEAAQ==
-----END PUBLIC KEY-----`;

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAI9Jm7T8/yzNyyq2Tl1VwAehKiWcMeOJcvOMkcnWQSyYic4X5e3M
U7B5nHMrdFO+L35dlHc0CgqyF72H/tMs4D0CAwEAAQJATkoJqXoScoh+2XeCmbyg
j4qfXK1bFNek1y2W+pD2S0a7uEwsOade2b5FK2ohtgGwlkaqyrKhBqzODvMrnxX0
AQIhAMD1YocNmlw0NsN4TJKxCxXgQxo6v1RTxVUVbCU84vZFAiEAvhnaZmI6fCrW
aml9Ga9CCaklrgtJnb2wcbNPXQCofZkCIDa6YoOjnBBiztWKHU3N4TMHNIEQAIxO
Zj3HobC+IDFxAiAe682egbPJpp4hyO7UUrGHKMA8QxHCWqxskiICmqzNYQIgcV4C
STXXplkZivpaqkncUgFMyRFQQTLmwHWy9nyECDU=
-----END RSA PRIVATE KEY-----`;

const i = "jeswin.dev"; // Issuer
const s = "jeswinpk@agilehead.com"; // Subject
const a = "http://agilehead.com"; // Audience

// SIGNING OPTIONS
const signOptions = {
  issuer: i,
  subject: s,
  audience: a,
  expiresIn: "12h",
  algorithm: "RS256"
};

module.exports = {
  publicKey,
  privateKey,
  signOptions
};
