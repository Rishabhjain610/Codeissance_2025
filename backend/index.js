// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");
// const app = express();
// const dotenv = require("dotenv");
// dotenv.config();
// const connectDB = require("./Db/Db");
// const cookieParser = require("cookie-parser");
// const AuthRouter = require("./routes/auth.routes");
// const UserRouter = require("./routes/user.routes");

// connectDB();
// const PORT = process.env.PORT;

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:3000",
//       "http://localhost:5174",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,

//   })
// );
// app.use(express.json());
// app.use(cookieParser());

// app.use("/api/auth", AuthRouter);
// app.use("/api/user", UserRouter);

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./Db/Db");
const AuthRouter = require("./routes/auth.routes");
const UserRouter = require("./routes/user.routes");
const AppointmentRouter = require("./routes/appointment.routes");
const RequestRouter = require("./routes/request.routes");
const BloodBankRouter = require("./routes/bloodbank.routes");
const HospitalRouter = require("./routes/hospital.routes");
const SosRouter = require("./routes/sos.routes");
const uploadRoutes = require("./routes/upload.routes");


const geminiRoutes = require("./routes/gemini.routes");




const app = express();
require("dotenv").config();
const PORT = process.env.PORT;
connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());


app.use("/api/gemini", geminiRoutes);
app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);
app.use("/api/appointment", AppointmentRouter);
app.use("/api/request", RequestRouter);
app.use("/api/bloodbank", BloodBankRouter);
app.use("/api/hospital", HospitalRouter);
app.use("/api/sos", SosRouter);


app.use("/api/upload", uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
