const express = require("express");
const router = express.Router();
const { checkCertificate } = require("../controller/gemini.controller");

router.post("/check-certificate", checkCertificate);

module.exports = router;