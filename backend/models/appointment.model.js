const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const appointmentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
  bloodBankId: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
  type: { type: String, enum: ["blood", "organ"], required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
  pdfUrl: String,
}, { timestamps: true });

module.exports = model("Appointment", appointmentSchema);