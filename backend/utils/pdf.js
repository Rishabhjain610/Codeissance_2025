const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Auth = require("../models/auth.model");

exports.generatePDF = async (appointment) => {
  // Fetch user and blood bank details for readable info
  const user = await Auth.findById(appointment.userId);
  const bloodBank = await Auth.findById(appointment.bloodBankId);

  // Ensure receipts directory exists
  const receiptsDir = path.join(__dirname, "../receipts");
  if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

  const pdfPath = path.join(receiptsDir, `${appointment._id}.pdf`);
  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(pdfPath));
  doc.fontSize(20).text("Appointment Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Donor Name: ${user?.name || appointment.userId}`);
  doc.text(`Donor Phone: ${user?.phone || ""}`);
  doc.text(`Blood Bank: ${bloodBank?.name || appointment.bloodBankId}`);
  doc.text(`Blood Bank City: ${bloodBank?.location?.city || ""}`);
  doc.text(`Type: ${appointment.type}`);
  doc.text(`Date: ${new Date(appointment.date).toLocaleString("en-IN")}`);
  doc.text(`Status: ${appointment.status}`);
  doc.end();

  return `/api/appointment/receipt/${appointment._id}`;
};