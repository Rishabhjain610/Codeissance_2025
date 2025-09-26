const express = require("express");
const { bookAppointment } = require("../controller/appointment.controller");
const AppointmentRouter = express.Router();

AppointmentRouter.post("/book", bookAppointment);
AppointmentRouter.get("/receipt/:id", (req, res) => {
  const pdfPath = path.join(__dirname, "../receipts", `${req.params.id}.pdf`);
  res.download(pdfPath);
});

module.exports = AppointmentRouter;