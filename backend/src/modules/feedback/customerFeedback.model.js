const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    mobile: mongoose.Schema.Types.Mixed,
    userName: String,

    HelpNeeded: String,
    helpResponseAt: Date,
}, { strict: false });


module.exports = mongoose.model("customer_feedback_logs", schema);