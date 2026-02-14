const learningService = require("../services/learning.service");

async function recordLearning(req, res) {
  try {
    const user_id = req.userId;
    const { song_id } = req.body || {};
    if (!user_id || !song_id) {
      return res.status(400).json({ message: "user_id and song_id are required" });
    }
    await learningService.upsertLearningRecord(user_id, song_id);
    return res.success({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getRecentLearned(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "未登录" });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const songs = await learningService.getRecentLearnedSongs(userId, limit);
    return res.success({ songs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  recordLearning,
  getRecentLearned,
};
