// Importing required modules
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const ncrypt = require("ncrypt-js");

// Import Required Schemas
const UserSchema = require("../Schemas/UserSchema");
const RefreshTokenSchema = require("../Schemas/RefreshTokenSchema");

// Importing the nodemailer utility
const sendMail = require("../Utilities/nodemailer");

// Creating the router
const router = express.Router();

// @route: /authentication/login
// @desc: Route for logging in users
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide an email and password" });
    }
    const user = await UserSchema.findOne({
      email: email,
    });

    if (!user) return res.status(404).json({ error: "User does not exist" });

    const validation = await bcrypt.compare(password, user.password);

    if (validation) {
      // Create access token
      const accessToken = jwt.sign(
        { name: user.name, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRE }
      );

      // Create refresh token
      const refreshToken = jwt.sign(
        { name: user.name, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );

      // Checking if refresh token is already present
      const tempRefreshToken = await RefreshTokenSchema.findOne({
        author: { name: user.name, email: user.email },
      });
      if (!tempRefreshToken)
        await RefreshTokenSchema.create({
          author: { name: user.name, email: user.email },
          refreshToken: refreshToken,
        });
      else
        await RefreshTokenSchema.findOneAndUpdate(
          { author: { name: user.name, email: user.email } },
          { refreshToken: refreshToken }
        );

      // Returning jwt
      return res.status(200).json({
        message: "User login successful",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } else
      return res.status(400).json({ error: "Password provided is invalid" });
  } catch (err) {
    console.error(err);
  }
});

// @route: /authentication/register
// @desc: Route for registering a user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Provide the necessary details" });

    // Checking if user is already registered
    const userCheck = await UserSchema.findOne({ email: email });
    if (userCheck)
      return res.status(401).json({ error: "User already present" });

    // Creating a new user
    const user = new UserSchema();
    user.name = name;
    user.email = email;

    // Generating encrypted password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    user.password = hash;

    // Saving user in database
    user.save().then(async (doc) => {
      // Creating access token
      const accessToken = jwt.sign(
        { name: user.name, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRE }
      );

      // Creating refresh token
      const refreshToken = jwt.sign(
        { name: user.name, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );

      // Adding to list of refresh tokens
      await RefreshTokenSchema.create({
        author: { name: user.name, email: user.email },
        refreshToken: refreshToken,
      });

      // Sending response
      res.status(201).json({
        message: "User registeration successful",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    });
  } catch (err) {
    console.error(err);
  }
});

// @route: /authentication/logout
// @desc: Route for logging out a user
router.delete("/logout", async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ error: "No refresh token provided" });

    // Check if refrsh token is present in database
    const tempRefreshToken = await RefreshTokenSchema.findOne({
      refreshToken: refreshToken,
    });
    if (!tempRefreshToken)
      return res.status(403).json({ error: "No such refresh token present" });

    // Deleting the refreshToken from database
    await tempRefreshToken.delete();

    return res.status(200).json({ message: "User logout successful" });
  } catch (err) {
    console.error(err);
  }
});

// @route: /authentication/forgotPassword
// @desc: Route for making a forgot password request
router.post("/forgotPassword", async (req, res) => {
  try {
    const email = req.body.email;
    if (!email)
      return res.status(404).json({ error: "No such email registered" });

    // Creating encryption object
    const ncryptObject = new ncrypt(process.env.FORGOT_PASSWORD_SECRET);

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    // Saving resetPasswordToken to database and setting expiry time
    await UserSchema.findOneAndUpdate(
      { email: email },
      {
        resetPasswordToken: ncryptObject.encrypt(resetPasswordToken),
        resetPasswordExpires: Date.now() + 15 * 60 * 1000,
      }
    );

    // Sending the mail (BE SURE TO CHANGE THE FINAL THING AFTER FRONT END IS DONE!!!!!!)
    await sendMail({
      email: email,
      subject: "Password Reset",
      message: `Make a PUT request with your new password in the body to the following url: ${
        req.protocol
      }://${req.get(
        "host"
      )}/authentication/resetPassword/${resetPasswordToken}`,
    });

    return res.status(200).json({ message: "Mail has been sent to email id" });
  } catch (err) {
    console.error(err);
  }
});

// @route: /authentication/resetPassword/:id
// @desc: Route for resetting the password
router.put("/resetPassword/:id", async (req, res) => {
  try {
    // Getting the encryptedToken and new password
    const password = req.body.password;
    const resetPasswordToken = req.params.id;
    if (!password)
      return res.status(401).json({ error: "New Password not provided" });

    // Creating encryption object
    const ncryptObject = new ncrypt(process.env.FORGOT_PASSWORD_SECRET);

    // Fetching appropriate user
    const user = await UserSchema.findOne({
      resetPasswordToken: ncryptObject.encrypt(resetPasswordToken),
    });

    if (!user || user.resetPasswordExpires.getTime() < Date.now())
      return res.status(404).json({ error: "Invalid password reset link" });

    // Generating new encrypted password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Saving the new password, setting resetPasswordExpires and resetPasswordToken to undefined
    user.password = hash;
    user.resetPasswordExpires = undefined;
    user.resetPasswordToken = undefined;

    // Saving the new password
    await user.save();

    return res.status(201).json({ message: "password updated sucessfully" });
  } catch (err) {
    console.error(err);
  }
});

// @route: /authentication/generate
// @desc: Generate new refresh token
router.post("/generate", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ error: "No refresh token provided" });

    // Check if refrsh token is present in database
    const tempRefreshToken = await RefreshTokenSchema.findOne({
      refreshToken: refreshToken,
    });
    if (!tempRefreshToken)
      return res.status(403).json({ error: "No such refresh token present" });

    // Verifying the refresh token and creating new access token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err)
        return res.status(403).json({ error: "No such refresh token present" });
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.status(201).json({ accessToken: accessToken });
    });
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;
