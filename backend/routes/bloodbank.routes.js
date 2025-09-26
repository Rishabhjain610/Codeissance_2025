const express = require("express");
const BloodBankRouter = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  getBloodBankProfile,
  updateBloodStock,
  getAppointments,
} = require("../controller/bloodbank.controller");

BloodBankRouter.get("/profile", authMiddleware, getBloodBankProfile);
BloodBankRouter.put("/stock", authMiddleware, updateBloodStock);
BloodBankRouter.get("/appointments", authMiddleware, getAppointments);

module.exports = BloodBankRouter;