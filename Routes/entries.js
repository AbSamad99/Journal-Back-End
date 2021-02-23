// Importing required modules
const express = require("express");
const jwt = require("jsonwebtoken");
const ncrypt = require("ncrypt-js");

// Import Required Schemas
const EntrySchema = require("../Schemas/EntrySchema");

const router = express.Router();

// @route: /entries/fetchAll
// @desc: Get all entries of user
router.get("/fetchAll", authenticate, async (req, res) => {
  try {
    const user = req.user;

    // Creating encryption object
    const ncryptObject = new ncrypt(process.env.NCRYPT_KEY);

    // Fetching entries
    const entries = await EntrySchema.findOne({
      author: { name: user.name, email: user.email },
    }).select("journalEntries");

    if (!entries) return res.status(400).json({ error: "No entries present" });
    else {
      return res.status(200).json({
        entries: entries.journalEntries.map((entry) => ({
          date: entry.date,
          content: ncryptObject.decrypt(entry.content),
        })),
      });
    }
  } catch (err) {
    console.error(err);
  }
});

// @route: /entries/fetchOne
// @desc: Get single entry of user
router.get("/fetchOne", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const date = req.body.date;

    // Creating encryption object
    const ncryptObject = new ncrypt(process.env.NCRYPT_KEY);

    // Fetching the entry
    const entry = await EntrySchema.findOne(
      {
        author: { name: user.name, email: user.email },
        "journalEntries.date": date,
      },
      { "journalEntries.$": 1 }
    );

    // Checking if entry is present in db
    if (!entry) return res.status(401).json({ error: "No such entry present" });
    else {
      return res.status(200).json({
        entry: {
          date: entry.journalEntries[0].date,
          content: ncryptObject.decrypt(entry.journalEntries[0].content),
        },
      });
    }
  } catch (err) {
    console.error(err);
  }
});

// @route: /entries/save
// @desc: Save an entry
router.post("/save", authenticate, async (req, res) => {
  try {
    const user = req.user;

    // Getting entry text and date
    const { content, date } = req.body;

    // Creating encryption object and decrypting data
    const ncryptObject = new ncrypt(process.env.NCRYPT_KEY);

    // Getting the users journal entries object from database
    let entries = await EntrySchema.findOne({
      author: { name: user.name, email: user.email },
    }).select("journalEntries");

    if (!entries) {
      entries = [{ date: date, content: ncryptObject.encrypt(content) }];
      await EntrySchema.create({
        author: { name: user.name, email: user.email },
        journalEntries: entries,
      });
      return res.status(201).json({ message: "Entry saved successfully" });
    } else {
      entries.journalEntries.push({
        date: date,
        content: ncryptObject.encrypt(content),
      });
      await entries.save();
      return res.status(201).json({ message: "Entry saved successfully" });
    }
  } catch (err) {
    console.error(err);
  }
});

// @route: /entries/update
// @desc: Update an entry
router.put("/update", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { date, content } = req.body;

    // Creating encryption object
    const ncryptObject = new ncrypt(process.env.NCRYPT_KEY);

    // Fetching the entry
    const entry = await EntrySchema.findOne(
      {
        author: { name: user.name, email: user.email },
        "journalEntries.date": date,
      },
      { "journalEntries.$": 1 }
    );

    // Checking if entry is present in db
    if (!entry) return res.status(401).json({ error: "No such entry present" });
    else {
      // Updating the entry
      await EntrySchema.findOneAndUpdate(
        {
          author: { name: user.name, email: user.email },
          "journalEntries.date": date,
        },
        { $set: { "journalEntries.$.content": ncryptObject.encrypt(content) } }
      );
      return res.status(200).json({ message: "Entry updated successfully" });
    }
  } catch (err) {
    console.error(err);
  }
});

// @route: /entries/delete
// @desc: Delete an entry
router.delete("/delete", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const date = req.body.date;

    // Fetching the entry
    const entry = await EntrySchema.findOne(
      {
        author: { name: user.name, email: user.email },
        "journalEntries.date": date,
      },
      { "journalEntries.$": 1 }
    );

    // Checking if entry is present in db
    if (!entry) return res.status(401).json({ error: "No such entry present" });
    else {
      await EntrySchema.findOneAndUpdate(
        { author: { name: user.name, email: user.email } },
        { $pull: { journalEntries: { date: date } } }
      );
      return res.status(200).json({ message: "Entry deleted successfully" });
    }
  } catch (err) {
    console.error(err);
  }
});

// @route: No route, helper function
// @desc: Middleware function to verify the access tokens
function authenticate(req, res, next) {
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
}

module.exports = router;
