const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
  author: { name: String, email: String },
  refreshToken: String,
});

module.exports = mongoose.model("RefreshTokenSchema", RefreshTokenSchema);
