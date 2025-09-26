const { jsPDF } = require("jspdf");
const fs = require("fs");

exports.generatePDF = async (appointment) => {
  const doc = new jsPDF();
  doc.text(`Appointment Receipt`, 10, 10);
  doc.text(`User: ${appointment.userId}`, 10, 20);
  doc.text(`Blood Bank: ${appointment.bloodBankId}`, 10, 30);
  doc.text(`Type: ${appointment.type}`, 10, 40);
  doc.text(`Date: ${appointment.date}`, 10, 50);
  const pdfPath = `receipts/${appointment._id}.pdf`;
  fs.writeFileSync(pdfPath, doc.output());
  return pdfPath;
};