const mongoose = require("mongoose");
require("dotenv").config();
const { Schema, model } = mongoose;
const authSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () { return !this.isGoogleUser; }
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("Auth", authSchema);
