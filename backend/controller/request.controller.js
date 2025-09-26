// const Request = require("../models/request.model");
// const axios = require("axios");

// exports.createRequest = async (req, res) => {
//   const { requesterId, type, bloodGroup, organType, urgency } = req.body;
//   try {
//     // If unavailable, call ML service
//     let matchedDonors = [];
//     if (type === "blood") {
//       const mlRes = await axios.post("http://localhost:5000/find-donors", { bloodGroup, requesterId });
//       matchedDonors = mlRes.data.donors;
//     }
//     const request = await Request.create({ requesterId, type, bloodGroup, organType, urgency, matchedDonors });
//     res.status(201).json({ request, matchedDonors, success: true });
//   } catch (err) {
//     res.status(500).json({ message: "Request failed" });
//   }
// };