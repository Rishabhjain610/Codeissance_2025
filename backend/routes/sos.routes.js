const express = require("express");
const { createSosAlert, getSosAlerts, updateSosAlert } = require("../controller/sos.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Normal user creates SOS
router.post("/", authMiddleware, createSosAlert);

// Hospital fetches its SOS alerts
router.get("/", authMiddleware, getSosAlerts);

// Hospital updates a specific SOS alert
router.put("/:alertId", authMiddleware, updateSosAlert);

module.exports = router;
