// const mongoose = require("mongoose");
// const { Schema, model } = mongoose;

// const requestSchema = new Schema({
//   requesterId: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
//   type: { type: String, enum: ["blood", "organ"], required: true },
//   bloodGroup: String,
//   organType: String,
//   urgency: { type: String, enum: ["low", "medium", "high"], default: "medium" },
//   status: { type: String, enum: ["pending", "matched", "completed", "cancelled"], default: "pending" },
//   matchedDonors: [{ type: Schema.Types.ObjectId, ref: "Auth" }],
//   createdAt: { type: Date, default: Date.now },
// }, { timestamps: true });

// module.exports = model("Request", requestSchema);