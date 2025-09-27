const express = require("express");
const BloodBankRouter = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  getBloodBankProfile,
  updateBloodStock,
  getAppointments,
  getBloodRequests,
  handleAppointmentAction,
  handleBloodRequestAction,
} = require("../controller/bloodbank.controller");

BloodBankRouter.get("/profile", authMiddleware, getBloodBankProfile);
BloodBankRouter.put("/stock", authMiddleware, updateBloodStock);
BloodBankRouter.get("/appointments", authMiddleware, getAppointments);
BloodBankRouter.get("/requests", authMiddleware, getBloodRequests);
BloodBankRouter.put("/appointment/:id/complete", authMiddleware, handleAppointmentAction);
BloodBankRouter.put("/appointment/:id/reject", authMiddleware, handleAppointmentAction);
BloodBankRouter.put("/request/:id/fulfill", authMiddleware, handleBloodRequestAction);
BloodBankRouter.put("/request/:id/reject", authMiddleware, handleBloodRequestAction);

module.exports = BloodBankRouter;