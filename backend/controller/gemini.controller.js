const axios = require("axios");

const checkCertificate = async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ result: "no", message: "No image provided" });

  // Extract base64 data (remove "data:image/jpeg;base64," or similar prefix)
  const base64Data = base64Image.split(',')[1];

  try {
    const geminiRes = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent",
      {
        contents: [
          {
            parts: [
              { text: "Is this person eligible to donate blood? Reply only yes or no." },
              { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    const answer = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || "";
    if (answer.includes("yes")) {
      return res.json({ result: "yes" });
    } else {
      return res.json({ result: "no" });
    }
  } catch (err) {
    console.error("Gemini error:", err?.response?.data || err.message);
    return res.status(500).json({ result: "no", message: "Gemini API error" });
  }
};

module.exports = { checkCertificate };