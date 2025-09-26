const axios = require("axios");
const Tesseract = require("tesseract.js");

function extractField(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

const checkCertificate = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ result: "no", message: "No image provided" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ result: "no", message: "API key not configured" });
    }

    let base64Data;
    if (base64Image.includes(',')) {
      base64Data = base64Image.split(',')[1];
    } else {
      base64Data = base64Image;
    }

    const imageBuffer = Buffer.from(base64Data, "base64");
    const ocrResult = await Tesseract.recognize(imageBuffer, "eng");
    const extractedText = ocrResult.data.text;
    console.log("Extracted text from certificate:", extractedText);

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(400).json({ result: "no", message: "Could not extract text from image. Please upload a clearer certificate." });
    }

    const bloodGroup = extractField(extractedText, /Blood\s*Group[:\-]?\s*([ABO]{1,2}[+-])/i);
    const phone = extractField(extractedText, /Phone[:\-]?\s*(\d{10,12})/i) || extractField(extractedText, /Mobile[:\-]?\s*(\d{10,12})/i);
    const city = extractField(extractedText, /City[:\-]?\s*([A-Za-z\s]+)/i);
    const sex = extractField(extractedText, /Sex[:\-]?\s*(Male|Female|Other)/i) || extractField(extractedText, /Gender[:\-]?\s*(Male|Female|Other)/i);
    const age = extractField(extractedText, /Age[:\-]?\s*(\d{1,3})/i);

    // Ask Gemini for eligibility and reason
    const prompt = `This is the extracted medical certificate text:\n${extractedText}\nBased on this, is the person eligible to donate blood? Reply only 'yes' or 'no'. If not eligible, give a short reason after 'Reason:'. Example: no\nReason: Hemoglobin too low.`;
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 50,
        }
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000
      }
    );

    const candidates = geminiRes.data?.candidates;
    const answerText = candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase().trim() || "";
    console.log("Gemini answer:", answerText);

    let result = "no";
    let reason = "";
    if (answerText.includes("yes") && !answerText.includes("no")) {
      result = "yes";
    } else {
      result = "no";
      // Extract reason from Gemini response
      const reasonMatch = answerText.match(/reason:\s*(.*)/i);
      if (reasonMatch) {
        reason = reasonMatch[1].trim();
      }
    }

    return res.json({
      result,
      reason,
      bloodGroup,
      phone,
      city,
      sex,
      age,
      extractedText
    });

  } catch (err) {
    console.error("Gemini API Error Details:", err?.response?.data || err.message);
    return res.status(500).json({ result: "no", message: "AI service temporarily unavailable" });
  }
};

module.exports = { checkCertificate };