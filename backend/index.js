const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./Db/Db");
const cookieParser = require("cookie-parser");
const AuthRouter = require("./routes/auth.routes");
const UserRouter = require("./routes/user.routes");

connectDB();
const PORT = process.env.PORT;


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
   
  })
);
app.use(express.json());
app.use(cookieParser());



app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);










app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
