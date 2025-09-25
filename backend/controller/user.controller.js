const Auth=require("../models/auth.model");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const getCurrentUser=async(req,res )=>{
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
}
module.exports={getCurrentUser};