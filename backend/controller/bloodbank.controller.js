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

const getBloodRequests = async (req, res) => {
  try {
    // Get all blood requests from hospitals
    const hospitals = await Auth.find({ role: "Hospital" })
      .select("name location bloodRequests");
    
    const allRequests = [];
    hospitals.forEach(hospital => {
      if (hospital.bloodRequests && hospital.bloodRequests.length > 0) {
        hospital.bloodRequests.forEach(request => {
          allRequests.push({
            _id: request._id,
            bloodGroup: request.bloodGroup,
            quantity: request.quantity,
            status: request.status,
            createdAt: request.createdAt,
            hospitalId: { 
              name: hospital.name, 
              location: hospital.location 
            }
          });
        });
      }
    });
    
    res.status(200).json({ requests: allRequests });
  } catch (error) {
    console.error("Error fetching blood requests:", error);
    res.status(500).json({ message: "Error fetching blood requests" });
  }
};

const handleAppointmentAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { bloodType, unitsCollected, donationDate } = req.body;
    const action = req.originalUrl.includes('complete') ? 'complete' : 'reject';
    
    console.log("Appointment action:", action, "for ID:", id);
    
    // Import Appointment model
    const Appointment = require("../models/appointment.model");
    
    // Find the appointment
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Verify the appointment belongs to this blood bank
    if (appointment.bloodBankId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to modify this appointment" });
    }
    
    if (action === 'complete') {
      // Update appointment
      appointment.status = 'completed';
      appointment.bloodType = bloodType;
      appointment.unitsCollected = unitsCollected;
      appointment.donationDate = donationDate;
      await appointment.save();
      
      // Update blood bank stock
      const bloodBank = await Auth.findById(req.user.id);
      if (bloodBank) {
        // Handle Map type properly
        let currentStock = {};
        if (bloodBank.bloodStock && bloodBank.bloodStock instanceof Map) {
          currentStock = Object.fromEntries(bloodBank.bloodStock);
        } else if (bloodBank.bloodStock && typeof bloodBank.bloodStock === 'object') {
          currentStock = { ...bloodBank.bloodStock };
        }
        
        const currentAmount = currentStock[bloodType] || 0;
        const newAmount = Math.min(currentAmount + (unitsCollected || 1), 50); // Max limit 50
        currentStock[bloodType] = newAmount;
        
        // Convert back to Map
        bloodBank.bloodStock = new Map(Object.entries(currentStock));
        await bloodBank.save();
      }
      
      res.status(200).json({ message: `Appointment completed successfully` });
    } else {
      // Update appointment status to cancelled
      appointment.status = 'cancelled';
      await appointment.save();
      res.status(200).json({ message: `Appointment rejected` });
    }
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ message: "Error updating appointment", error: error.message });
  }
};

const handleBloodRequestAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { bloodType, quantity, fulfilledDate } = req.body;
    const action = req.path.includes('fulfill') ? 'fulfill' : 'reject';
    
    // Find the blood request
    const hospitals = await Auth.find({ role: "Hospital" });
    let targetRequest = null;
    let targetHospital = null;
    
    for (const hospital of hospitals) {
      const request = hospital.bloodRequests.id(id);
      if (request) {
        targetRequest = request;
        targetHospital = hospital;
        break;
      }
    }
    
    if (!targetRequest) {
      return res.status(404).json({ message: "Blood request not found" });
    }
    
    if (action === 'fulfill') {
      targetRequest.status = 'fulfilled';
      targetRequest.bloodType = bloodType;
      targetRequest.quantity = quantity;
      targetRequest.fulfilledDate = fulfilledDate;
      
      // Reduce blood stock
      const bloodBank = await Auth.findById(req.user.id);
      const currentStock = bloodBank.bloodStock || {};
      const newStock = { ...currentStock };
      const currentAmount = newStock[bloodType] || 0;
      const newAmount = Math.max(currentAmount - quantity, 0);
      newStock[bloodType] = newAmount;
      bloodBank.bloodStock = newStock;
      await bloodBank.save();
    } else {
      targetRequest.status = 'rejected';
    }
    
    await targetHospital.save();
    res.status(200).json({ message: `Blood request ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error updating blood request" });
  }
};

module.exports = {
  getBloodBankProfile,
  updateBloodStock,
  getAppointments,
  getBloodRequests,
  handleAppointmentAction,
  handleBloodRequestAction,
};