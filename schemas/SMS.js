const mongoose = require("mongoose");

const SMSSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
    },
    text: { type: String, default: null },
  },
  { timestamps: true }
);

let SMS;

try {
  SMS = mongoose.model("SMS");
} catch (err) {
  SMS = mongoose.model("SMS", SMSSchema);
}

module.exports = SMS;
