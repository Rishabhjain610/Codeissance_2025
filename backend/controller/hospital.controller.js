const Auth = require("../models/auth.model");

const getHospitalProfile = async (req, res) => {
  try {
    const hospital = await Auth.findById(req.user.id).select("-password");
    if (!hospital || hospital.role !== "Hospital") {
      return res.status(404).json({ message: "Hospital not found" });
    }
    res.status(200).json({ hospital });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getRequests = async (req, res) => {
  try {
    const hospital = await Auth.findById(req.user.id)
      .populate("bloodRequests")
      .populate("organRequests");
    res.status(200).json({
      bloodRequests: hospital.bloodRequests,
      organRequests: hospital.organRequests,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests" });
  }
};
module.exports={ getHospitalProfile, getRequests };