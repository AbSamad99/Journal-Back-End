// Importing required modules
const jwt = require("jsonwebtoken");

// @route: No route, helper function
// @desc: Middleware function to verify the access tokens
const authenticate = (req, res, next) => {
  try {
    // Getting the accessToken
    const authHeader = req.headers["authorization"];
    const accessToken = authHeader && authHeader.split(" ")[1];

    // Verifying accessToken
    if (!accessToken)
      return res.status(401).json({ error: "Access token not provided" });

    jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, user) => {
        // Verifying that accessToken is valid
        if (err)
          return res
            .status(403)
            .json({ error: "Invalid access token provided" });

        req.user = user;
        next();
      }
    );
  } catch (err) {
    console.error(err);
  }
};

module.exports = authenticate;
