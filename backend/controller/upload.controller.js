const cloudinary = require("../utils/cloudinary");

const uploadCertificate = async (req, res) => {
  try {
    const { image } = req.body; // image should be a base64 string or a remote URL
    if (!image) return res.status(400).json({ error: "No image provided" });

    const result = await cloudinary.uploader.upload(image, {
      folder: "medical_certificates",
      resource_type: "image",
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
};
module.exports = { uploadCertificate };