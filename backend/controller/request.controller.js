
const Auth = require("../models/auth.model");
const axios = require("axios"); // For Flask API (dummy for now)

const createBloodRequest = async (req, res) => {
  try {
    const { hospitalId, bloodGroup, quantity, location } = req.body;
    
    // Create a blood request record
    const bloodRequest = {
      hospitalId: hospitalId,
      bloodGroup: bloodGroup,
      quantity: quantity,
      location: location,
      status: "pending",
      createdAt: new Date(),
      _id: new require('mongoose').Types.ObjectId()
    };

    // Find the hospital and add the blood request
    const hospital = await Auth.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Add blood request to hospital
    if (!hospital.bloodRequests) {
      hospital.bloodRequests = [];
    }
    hospital.bloodRequests.push(bloodRequest);
    await hospital.save();

    // Find nearest blood bank with required blood group and quantity
    const bloodBanks = await Auth.find({
      role: "BloodBank",
      [`bloodStock.${bloodGroup}`]: { $gte: quantity }
    });

    if (bloodBanks.length > 0) {
      // Blood available, reduce stock in first matching blood bank
      const bloodBank = bloodBanks[0];
      bloodBank.bloodStock.set(bloodGroup, bloodBank.bloodStock.get(bloodGroup) - quantity);
      await bloodBank.save();
      return res.status(200).json({
        message: "Blood request fulfilled from blood bank",
        bloodBank: {
          name: bloodBank.name,
          location: bloodBank.location,
          phone: bloodBank.phone
        }
      });
    } else {
      // Blood not available, call Flask API (dummy data)
      // const flaskRes = await axios.post("http://flask-api/blood", { bloodGroup, location });
      // const donors = flaskRes.data.donors;
      const donors = [
        { name: "Donor1", phone: "9999990001", location: { latitude: 28.61, longitude: 77.21 } },
        { name: "Donor2", phone: "9999990002", location: { latitude: 28.62, longitude: 77.22 } },
        { name: "Donor3", phone: "9999990003", location: { latitude: 28.63, longitude: 77.23 } },
        { name: "Donor4", phone: "9999990004", location: { latitude: 28.64, longitude: 77.24 } },
        { name: "Donor5", phone: "9999990005", location: { latitude: 28.65, longitude: 77.25 } }
      ];
      return res.status(200).json({
        message: "Blood request created and sent to blood banks. Blood not immediately available, try contacting these donors",
        donors
      });
    }
  } catch (error) {
    console.error("Error processing blood request:", error);
    res.status(500).json({ message: "Error processing blood request" });
  }
};

const createOrganRequest = async (req, res) => {
  try {
    const { hospitalId, organType, location } = req.body;
    // Always call Flask API (dummy data)
    // const flaskRes = await axios.post("http://flask-api/organ", { organType, location });
    // const donors = flaskRes.data.donors;
    const donors = [
      { name: "OrganDonor1", phone: "8888880001", location: { latitude: 28.61, longitude: 77.21 } },
      { name: "OrganDonor2", phone: "8888880002", location: { latitude: 28.62, longitude: 77.22 } },
      { name: "OrganDonor3", phone: "8888880003", location: { latitude: 28.63, longitude: 77.23 } },
      { name: "OrganDonor4", phone: "8888880004", location: { latitude: 28.64, longitude: 77.24 } },
      { name: "OrganDonor5", phone: "8888880005", location: { latitude: 28.65, longitude: 77.25 } }
    ];
    return res.status(200).json({
      message: "Organ donors found via external API",
      donors
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing organ request" });
  }
};
module.exports = { createBloodRequest, createOrganRequest };