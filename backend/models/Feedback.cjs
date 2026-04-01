// backend/models/Feedback.cjs
const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    page: { type: String },          // Which page (IssueForm, VerifyForm)
    certId: { type: String },        // Optional: related certificate
    name: { type: String },          // Optional user info
    email: { type: String },
    message: { type: String, required: true }, // Feedback text
    rating: { type: Number, min: 1, max: 5 },
    type: { type: String, default: "suggestion" } // suggestion | bug | scanFeedback
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);
