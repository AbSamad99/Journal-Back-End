const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  author: { name: String, email: { type: String, unique: true } },
  journalEntries: [{ date: String, content: String }],
});

module.exports = mongoose.model("EntrySchema", EntrySchema);
