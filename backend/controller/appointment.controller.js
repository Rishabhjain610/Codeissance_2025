const Appointment = require("../models/appointment.model");
const { generatePDF } = require("../utils/pdf");

exports.bookAppointment = async (req, res) => {
  const { userId, bloodBankId, type, date } = req.body;
  try {
    const appointment = await Appointment.create({ userId, bloodBankId, type, date });
    const pdfUrl = await generatePDF(appointment); // Save PDF and return URL
    appointment.pdfUrl = pdfUrl;
    await appointment.save();
    res.status(201).json({ appointment, pdfUrl, success: true });
  } catch (err) {
    res.status(500).json({ message: "Booking failed" });
  }
};