const ttsService = require("../services/tts.service");

async function getTTS(req, res) {
  const { word } = req.query;
  if (!word || !word.trim()) {
    return res.fail(400, "word is required");
  }

  try {
    const url = await ttsService.getOrGenerateTTS(word.trim());
    return res.success({ url });
  } catch (error) {
    console.error("TTS error:", error);
    return res.fail(error.status || 500, error.message || "TTS 生成失败");
  }
}

module.exports = { getTTS };
