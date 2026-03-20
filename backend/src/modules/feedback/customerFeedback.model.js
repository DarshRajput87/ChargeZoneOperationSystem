const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  mobile: String,
  userName: String,

  HelpNeeded: String,
  helpResponseAt: Date,
});

module.exports = mongoose.model("customer_feedback_logs", schema);