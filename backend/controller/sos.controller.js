const Auth = require("../models/auth.model");

const createSosAlert = async (req, res) => {
  try {
    const { userId, emergencyType, urgency, description, location, timestamp } = req.body;
    
    // Create SOS alert
    const sosAlert = {
      userId: userId,
      emergencyType: emergencyType,
      urgency: urgency,
      description: description,
      location: location,
      timestamp: timestamp,
      status: "active",
      _id: new require('mongoose').Types.ObjectId()
    };

    // Find all hospitals and add the SOS alert
    const hospitals = await Auth.find({ role: "Hospital" });
    
    for (const hospital of hospitals) {
      if (!hospital.sosAlerts) {
        hospital.sosAlerts = [];
      }
      hospital.sosAlerts.push(sosAlert);
      await hospital.save();
    }

    res.status(200).json({ 
      message: "SOS alert sent to all hospitals",
      alertId: sosAlert._id
    });
  } catch (error) {
    console.error("Error creating SOS alert:", error);
    res.status(500).json({ message: "Error creating SOS alert" });
  }
};

const getSosAlerts = async (req, res) => {
  try {
    const hospital = await Auth.findById(req.user.id);
    if (!hospital || hospital.role !== "Hospital") {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const alerts = hospital.sosAlerts || [];
    res.status(200).json({ alerts });
  } catch (error) {
    console.error("Error fetching SOS alerts:", error);
    res.status(500).json({ message: "Error fetching SOS alerts" });
  }
};

const updateSosAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, ambulanceDispatched } = req.body;

    const hospital = await Auth.findById(req.user.id);
    if (!hospital || hospital.role !== "Hospital") {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const alert = hospital.sosAlerts.id(alertId);
    if (!alert) {
      return res.status(404).json({ message: "SOS alert not found" });
    }

    if (status) alert.status = status;
    if (ambulanceDispatched !== undefined) alert.ambulanceDispatched = ambulanceDispatched;

    await hospital.save();
    res.status(200).json({ message: "SOS alert updated successfully" });
  } catch (error) {
    console.error("Error updating SOS alert:", error);
    res.status(500).json({ message: "Error updating SOS alert" });
  }
};

module.exports = {
  createSosAlert,
  getSosAlerts,
  updateSosAlert
};
