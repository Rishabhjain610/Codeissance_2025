const Appointment = require("../models/appointment.model");
const Auth = require("../models/auth.model");
const { generatePDF } = require("../utils/pdf");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'
const client = twilio(accountSid, authToken);

const bookAppointment = async (req, res) => {
  const { userId, bloodBankId, type, date } = req.body;
  try {
    const appointment = await Appointment.create({ userId, bloodBankId, type, date });
    await Auth.findByIdAndUpdate(userId, { $push: { donationHistory: appointment._id } });
    await Auth.findByIdAndUpdate(bloodBankId, { $push: { appointments: appointment._id } });

    // Generate PDF
    const pdfUrl = await generatePDF(appointment);

    // Send WhatsApp message
    const user = await Auth.findById(userId);
    if (user && user.phone) {
      await client.messages.create({
        from: whatsappFrom,
        to: `whatsapp:+91${user.phone}`, // India country code
        body: `Hi ${user.name}, your appointment is booked for ${type} donation on ${date}.`
      });
    }

    res.status(201).json({ appointment, pdfUrl, success: true });
  } catch (err) {
    res.status(500).json({ message: "Error booking appointment" });
  }
};

module.exports = { bookAppointment };