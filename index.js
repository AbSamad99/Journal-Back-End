// Importing required packages
const express = require("express");
const dotenv = require("dotenv");
const colors = require("colors");

// Initialising app
const app = express();

// Importing routes
const authenticationRoutes = require("./Routes/authentication");
const entryRoutes = require("./Routes/entries");

// Importing custom middleware
const logger = require("./Middleware/logger");

//configuring environment variables
dotenv.config();

// Importing and connexting the db
const db = require("./DB");
db();

// Using middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(logger);

// Using Routers
app.use("/authentication", authenticationRoutes);
app.use("/entries", entryRoutes);

// default port
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});
