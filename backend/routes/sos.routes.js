const express = require("express");
const SosRouter = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  createSosAlert,
  getSosAlerts,
  updateSosAlert
} = require("../controller/sos.controller");

SosRouter.post("/alert", authMiddleware, createSosAlert);
SosRouter.get("/alerts", authMiddleware, getSosAlerts);
SosRouter.put("/alert/:alertId", authMiddleware, updateSosAlert);

module.exports = SosRouter;
