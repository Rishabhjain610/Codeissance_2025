const Auth = require("../models/auth.model");

const getBloodBankProfile = async (req, res) => {
  try {
    const bloodBank = await Auth.findById(req.user.id).select("-password");
    if (!bloodBank || bloodBank.role !== "BloodBank") {
      return res.status(404).json({ message: "Blood Bank not found" });
    }
    res.status(200).json({ bloodBank });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateBloodStock = async (req, res) => {
  try {
    const { bloodStock, organStock } = req.body;
    const bloodBank = await Auth.findByIdAndUpdate(
      req.user.id,
      { bloodStock, organStock },
      { new: true }
    );
    res.status(200).json({ bloodBank, message: "Stock updated" });
  } catch (error) {
    res.status(500).json({ message: "Error updating stock" });
  }
};

const getAppointments = async (req, res) => {
  try {
    // Populate userId and bloodBankId to get full user and blood bank info
    const bloodBank = await Auth.findById(req.user.id).populate({
      path: "appointments",
      populate: [
        { path: "userId", select: "name phone bloodGroup location" },
        { path: "bloodBankId", select: "name location" }
      ]
    });
    res.status(200).json({ appointments: bloodBank.appointments });
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments" });
  }
};
module.exports = {
  getBloodBankProfile,
  updateBloodStock,
  getAppointments,
};