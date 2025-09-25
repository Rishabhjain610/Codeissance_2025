const express = require("express");
const { getCurrentUser } = require("../controller/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

const UserRouter = express.Router();

UserRouter.get("/getcurrentuser", authMiddleware, getCurrentUser);

module.exports = UserRouter;
