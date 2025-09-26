// const Auth=require("../models/auth.model");
// const bcrypt=require("bcryptjs");
// const jwt=require("jsonwebtoken");
// const getCurrentUser=async(req,res )=>{
//   try {
//     const user = await Auth.findById(req.user.id).select("-password");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.status(200).json({
//       message: "User retrieved successfully",
//       user,
//       success: true,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// }
// const updateProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const updateData = req.body;
//     updateData.profileCompleted = true;
//     const user = await Auth.findByIdAndUpdate(userId, updateData, { new: true });
//     res.status(200).json({
//       message: "Profile updated",
//       user,
//       success: true,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating profile" });
//   }
// };
// module.exports={getCurrentUser,updateProfile};
const Auth = require("../models/auth.model");

const getCurrentUser = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: "User retrieved successfully",
      user,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    updateData.profileCompleted = true;
    const user = await Auth.findByIdAndUpdate(userId, updateData, { new: true });
    res.status(200).json({
      message: "Profile updated",
      user,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile" });
  }
};

module.exports = { getCurrentUser, updateProfile };