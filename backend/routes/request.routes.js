
const express = require("express");
const { createBloodRequest, createOrganRequest } = require("../controller/request.controller");
const authMiddleware = require("../middleware/auth.middleware");
const RequestRouter = express.Router();

// Hospital requests blood
RequestRouter.post("/blood", authMiddleware, createBloodRequest);

// Hospital requests organ
RequestRouter.post("/organ", authMiddleware, createOrganRequest);

module.exports = RequestRouter;