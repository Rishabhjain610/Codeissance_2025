const express = require("express");
const router = express.Router();
const { uploadCertificate } = require("../controller/upload.controller");

router.post("/certificate", uploadCertificate);

module.exports = router;