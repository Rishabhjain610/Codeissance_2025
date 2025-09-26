const express = require("express");
const { bookAppointment } = require("../controller/appointment.controller");
const AppointmentRouter = express.Router();

AppointmentRouter.post("/book", bookAppointment);

module.exports = AppointmentRouter;