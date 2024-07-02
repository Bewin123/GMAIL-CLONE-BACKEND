module.exports = {
  jwtSecret: "your_jwt_secret",
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGODB_URI,
};
