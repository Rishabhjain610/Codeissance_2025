const jwt = require("jsonwebtoken");
require("dotenv").config();
const generateToken = (user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return token;
};
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error.message);
    return null;
  }
};
module.exports = { generateToken, verifyToken };
