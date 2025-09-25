const Auth = require("../models/auth.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/token");
require("dotenv").config();
const SignUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).send("All fields are required");
    }
    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Auth.create({
      name,
      email,
      password: hashedPassword,
      isGoogleUser: false,
    });
    const token = generateToken(newUser);
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
      success: true,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error in SignUp");
  }
};

const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("All fields are required");
    }
    const user = await Auth.findOne({ email });
    if (!user) {
      return res.status(400).send("User does not exist");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send("Invalid credentials");
    }
    const token = generateToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite:"lax",
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    });
    res.status(200).json({
      message: "Login successful",
      user: user,
      success: true,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error in Login");
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
    if (!name || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      const token = generateToken(existingUser);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      });
      return res.status(200).json({
        message: "Login successful",
        user: existingUser,
        success: true,
      });
    } else {
      const newUser = await Auth.create({
        name,
        email,

        isGoogleUser: true,
      });
      const token = generateToken(newUser);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      });
      res.status(201).json({
        message: "User registered successfully",
        user: newUser,
        success: true,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Google Login Server Error" });
  }
};

module.exports = { SignUp, Login, Logout, googleSignIn };
