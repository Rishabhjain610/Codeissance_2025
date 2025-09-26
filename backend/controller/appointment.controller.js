const Appointment = require("../models/appointment.model");
const Auth = require("../models/auth.model");
const { generatePDF } = require("../utils/pdf");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const client = twilio(accountSid, authToken);

const bookAppointment = async (req, res) => {
  const { userId, bloodBankId, type, date } = req.body;
  try {
    const appointment = await Appointment.create({ userId, bloodBankId, type, date });
    await Auth.findByIdAndUpdate(userId, { $push: { donationHistory: appointment._id } });
    await Auth.findByIdAndUpdate(bloodBankId, { $push: { appointments: appointment._id } });

    // Generate PDF
    await generatePDF(appointment);

    // Send WhatsApp message (no PDF link)
    const user = await Auth.findById(userId);
    const bloodBank = await Auth.findById(bloodBankId);
    if (user && user.phone) {
      const formattedDate = new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      });
      await client.messages.create({
        from: whatsappFrom,
        to: `whatsapp:+91${user.phone}`,
        body: `Hi ${user.name}, your appointment for ${type} donation is confirmed on ${formattedDate} at ${bloodBank?.name || ""}.`
      });
    }

    // Return PDF download URL
    res.status(201).json({
      appointment,
      pdfUrl: `/api/appointment/receipt/${appointment._id}`,
      success: true
    });
  } catch (err) {
    console.error("Appointment booking error:", err);
    res.status(500).json({ message: "Error booking appointment" });
  }
};

module.exports = { bookAppointment };