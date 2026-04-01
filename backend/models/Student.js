const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  usn: { type: String, required: true },
  dob: { type: String, required: true },
  university: { type: String, required: true },
  email: { type: String, unique: true, required: true }
});

module.exports = mongoose.model("Student", studentSchema);
