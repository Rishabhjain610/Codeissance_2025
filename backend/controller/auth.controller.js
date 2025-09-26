// const Auth = require("../models/auth.model");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const { generateToken } = require("../utils/token");
// require("dotenv").config();

// const SignUp = async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;
//     if (!name || !email || !password || !role) {
//       return res.status(400).send("All fields are required");
//     }
//     const existingUser = await Auth.findOne({ email, role });
//     if (existingUser) {
//       return res.status(400).send("User already exists");
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = await Auth.create({
//       name,
//       email,
//       password: hashedPassword,
//       isGoogleUser: false,
//       role,
//     });
//     const token = generateToken(newUser);
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "lax",
//       maxAge: 3 * 24 * 60 * 60 * 1000,
//     });

//     res.status(201).json({
//       message: "User created successfully",
//       user: newUser,
//       success: true,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Error in SignUp");
//   }
// };

// const Login = async (req, res) => {
//   try {
//     const { email, password, role } = req.body;
//     if (!email || !password || !role) {
//       return res.status(400).send("All fields are required");
//     }
//     const user = await Auth.findOne({ email, role });
//     if (!user) {
//       return res.status(400).send("User does not exist");
//     }
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).send("Invalid credentials");
//     }
//     const token = generateToken(user);
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: false,
//       sameSite:"lax",
//       maxAge: 3 * 24 * 60 * 60 * 1000,
//     });
//     res.status(200).json({
//       message: "Login successful",
//       user: user,
//       success: true,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Error in Login");
//   }
// };
// const Logout = (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     secure: false,
//     sameSite: "lax",
//   });
//   res.status(200).json({
//     message: "Logout successful",
//     success: true,
//   });
// };



// const googleSignIn = async (req, res) => {
//   try {
//     const { name, email } = req.body;
//     if (!name || !email) {
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     // Find user with role "NormalUser"
//     const existingUser = await Auth.findOne({ email, role: "NormalUser" });
//     if (existingUser) {
//       const token = generateToken(existingUser);
//       res.cookie("token", token, {
//         httpOnly: true,
//         secure: false,
//         sameSite: "lax",
//         maxAge: 3 * 24 * 60 * 60 * 1000,
//       });
//       return res.status(200).json({
//         message: "Login successful",
//         user: existingUser,
//         success: true,
//       });
//     } else {
//       const newUser = await Auth.create({
//         name,
//         email,
//         isGoogleUser: true,
//         role: "NormalUser", // <-- Add this line
//       });
//       const token = generateToken(newUser);
//       res.cookie("token", token, {
//         httpOnly: true,
//         secure: false,
//         sameSite: "lax",
//         maxAge: 3 * 24 * 60 * 60 * 1000,
//       });
//       res.status(201).json({
//         message: "User registered successfully",
//         user: newUser,
//         success: true,
//       });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Google Login Server Error" });
//   }
// };

// module.exports = { SignUp, Login, Logout, googleSignIn };
const Auth = require("../models/auth.model");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/token");

const SignUp = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }
    if (!["NormalUser", "Hospital", "BloodBank"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if ((role === "Hospital" || role === "BloodBank") && req.body.isGoogleUser) {
      return res.status(400).json({ message: "Google sign-in not allowed for this role" });
    }
    const existingUser = await Auth.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Auth.create({
      name,
      email,
      password: hashedPassword,
      role,
      isGoogleUser: req.body.isGoogleUser || false,
      ...req.body,
    });
    const token = generateToken(newUser);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });
    res.status(201).json({ user: newUser, success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const Login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }
    const user = await Auth.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.isGoogleUser && role !== "NormalUser") {
      return res.status(400).json({ message: "Google login only allowed for NormalUser" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });
    res.status(200).json({ user, success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const Logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  res.status(200).json({
    message: "Logout successful",
    success: true,
  });
};

const googleSignIn = async (req, res) => {
  try {
    const { name, email } = req.body;
    const role = "NormalUser";
    let user = await Auth.findOne({ email, role });
    if (!user) {
      user = await Auth.create({
        name,
        email,
        isGoogleUser: true,
        role,
      });
    }
    const token = generateToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });
    res.status(200).json({ user, success: true });
  } catch (error) {
    res.status(500).json({ message: "Google sign-in failed" });
  }
};

module.exports = { SignUp, Login, Logout, googleSignIn };