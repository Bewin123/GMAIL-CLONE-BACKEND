const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  // Define your email schema here
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipients: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Email", emailSchema);
