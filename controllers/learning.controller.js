const learningService = require("../services/learning.service");

async function recordLearning(req, res) {
  try {
    const { user_id, song_id } = req.body || {};
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
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: "user_id is required" });
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
