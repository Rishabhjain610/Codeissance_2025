const express = require("express");
const { getCurrentUser, updateProfile } = require("../controller/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

const UserRouter = express.Router();

UserRouter.get("/getcurrentuser", authMiddleware, getCurrentUser);
UserRouter.put("/updateprofile", authMiddleware, updateProfile);


module.exports = UserRouter;
