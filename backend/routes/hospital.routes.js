const express = require("express");
const HospitalRouter = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  getHospitalProfile,
  getRequests,
} = require("../controller/hospital.controller");

HospitalRouter.get("/profile", authMiddleware, getHospitalProfile);
HospitalRouter.get("/requests", authMiddleware, getRequests);

module.exports = HospitalRouter;