
const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const authSchema = new Schema(
  {
    role: { type: String, enum: ["NormalUser", "Hospital", "BloodBank"], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return !this.isGoogleUser;
      },
    },
    isGoogleUser: { type: Boolean, default: false },
    age: Number,
    sex: { type: String, enum: ["M", "F", "O"] },
    bloodGroup: String,
    phone: String,
    location: {
      latitude: Number,
      longitude: Number,
      city: String,
    },
    canDonateBlood: { type: Boolean, default: false },
    canDonateOrgan: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    bloodStock: { type: Map, of: Number, default: {} }, // For BloodBank
    
    appointments: [{ type: Schema.Types.ObjectId, ref: "Appointment" }], // For BloodBank
    organRequests: [{ type: Schema.Types.ObjectId, ref: "Request" }], // For Hospital
    bloodRequests: [{ type: Schema.Types.ObjectId, ref: "Request" }], // For Hospital
    donationHistory: [{ type: Schema.Types.ObjectId, ref: "Appointment" }], // For NormalUser
    requestHistory: [{ type: Schema.Types.ObjectId, ref: "Request" }], // For NormalUser
  },
  { timestamps: true }
);

module.exports = model("Auth", authSchema);